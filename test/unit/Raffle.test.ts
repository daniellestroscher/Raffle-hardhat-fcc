import { expect, assert } from "chai"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { localChains, networkConfig } from "../../hardhat-helper-config"
import { BigNumber, Contract } from "ethers"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { RaffleInterface } from "../../typechain-types/contracts/Raffle"

!localChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle: Raffle,
              VRFCoordinatorV2Mock: VRFCoordinatorV2Mock,
              deployer: string,
              interval: BigNumber,
              raffleEntranceFee: BigNumber
          const chainId = network.config.chainId as number

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              interval = await raffle.getInterval()
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("Constructor", function () {
              it("initializes the raffle correctly", async function () {
                  //ideally have 1 assert per it.
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("Enter Raffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughEthEntered"
                  )
              })
              it("records players as they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits an event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesn't allow entrance when raffle in calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  //Pretend to be a Chainlink automation
                  await raffle.performUpkeep([] /* empty calldata */)
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("Returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("Returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x" /* empty calldata */)
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false) //same as: assert(!upkeepNeeded)
              })
              it("Returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.sub(10).toNumber()])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, false) //same as: assert(!upkeepNeeded)
              })
              it("Returns true if enough time has passed, has players, eth and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkUpkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("fails if checkUpkeep returns false", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      `Raffle_UpkeepNotNeeded`
                  )
              })
              it("updates the raffle state, emits an event and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
                  const txResp = await raffle.performUpkeep("0x" /* empty calldata */)
                  const txReceipt = await txResp.wait(1)
                  const events = txReceipt.events!
                  const requestId = events[1].args!.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", function () {
              this.beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              //THIS IS WAY TO BIG
              it("picks a winner, resets the lottery and sends money", async function () {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1 //deployer is 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedToRaffle = raffle.connect(accounts[i])
                      await accountConnectedToRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked Event was found!")
                          try {
                              const recentWinner = await raffle.getMostRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0") //OPEN
                              assert(endingTimeStamp > startingTimeStamp)

                              //const entranceFeeBigNumber = BigNumber.from(raffleEntranceFee)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                          } catch (err) {
                              reject(err)
                          }
                          resolve()
                          //only assert after the winner is picked.
                      })
                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const events = txReceipt.events!
                      const requestId = events[1].args!.requestId

                      const winnerStartingBalance = await accounts[1].getBalance()
                      await VRFCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
                  })
              })
          })
      })
