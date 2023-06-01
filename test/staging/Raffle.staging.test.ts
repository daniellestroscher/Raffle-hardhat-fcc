import { expect, assert } from "chai"
import { ethers, getNamedAccounts, network } from "hardhat"
import { localChains, networkConfig } from "../../hardhat-helper-config"
import { BigNumber, Contract } from "ethers"
import { Raffle } from "../../typechain-types"

localChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle: Raffle, deployer: string, raffleEntranceFee: BigNumber

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords ", function () {
              it("works with live Chainlink automation's and VRF, we get a random winner", async function () {
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()
                  //we want to set up the listener before we enter the raffle,
                  //just in case the blockchain is mined very quickly.
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked Event Emitted!")
                          resolve()
                          try {
                              const recentWinner = await raffle.getMostRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              //assert here
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (err) {
                              console.log(err)
                              reject(err)
                          }
                      })
                      //Entering the Raffle, This code wont complete until out listener has finished listening!
                      const winnerStartingBalance = await accounts[0].getBalance()
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                  })
              })
          })
      })
