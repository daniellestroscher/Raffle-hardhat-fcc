import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Address, DeployFunction, DeployResult } from "hardhat-deploy/dist/types"
import { network, ethers } from "hardhat"
import { networkConfig, localChains } from "../hardhat-helper-config"
import { verify } from "../utils/verify"
import { ContractReceipt } from "ethers"
import { VRFCoordinatorV2Mock } from "../typechain-types"

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30")

const deployRaffle: DeployFunction = async function ({
    getNamedAccounts,
    deployments,
}: HardhatRuntimeEnvironment) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId as number
    const {
        entranceFee,
        gasLane,
        callbackGasLimit,
        interval,
        vrfCoordinatorV2,
        subscriptionId,
        blockConfirmations,
    } = networkConfig[chainId]

    let raffle: DeployResult
    const args = [
        entranceFee,
        vrfCoordinatorV2,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]

    if (localChains.includes(network.name)) {
        const deployerSigner = (await ethers.getSigners())[0]
        const VRFCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock")
        const vrfCoordinatorV2Address = VRFCoordinatorV2Mock.address
        const VRFCoordinatorV2MockContract = (await ethers.getContract(
            "VRFCoordinatorV2Mock",
            deployerSigner
        )) as VRFCoordinatorV2Mock
        const txResp = await VRFCoordinatorV2MockContract.createSubscription()
        const txReceipt = (await txResp.wait(1)) as ContractReceipt
        const eventsArr = txReceipt.events!
        const subscriptionIdMock = eventsArr[0].args!.subId
        //fund the subscription.
        await VRFCoordinatorV2MockContract.fundSubscription(subscriptionIdMock, VRF_SUB_FUND_AMOUNT)
        //add consumer
        raffle = await deploy("Raffle", {
            from: deployer,
            args: [
                entranceFee,
                vrfCoordinatorV2Address,
                gasLane,
                subscriptionIdMock,
                callbackGasLimit,
                interval,
            ],
            log: true,
            waitConfirmations: networkConfig[chainId as number].blockConfirmations || 1,
        })
        await VRFCoordinatorV2MockContract.addConsumer(subscriptionIdMock, raffle.address)
    } else {
        raffle = await deploy("Raffle", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: blockConfirmations || 1,
        })
    }

    if (!localChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(raffle.address, args)
    }
    log("--------------------------------------------------------------------")
}
export default deployRaffle
deployRaffle.tags = ["all", "raffle"]
