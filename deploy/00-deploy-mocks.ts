import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { network } from "hardhat"
import { localChains } from "../hardhat-helper-config"
import { ethers } from "ethers"

const BASE_FEE = ethers.utils.parseEther("0.25") //premium, costs 0.25 LINK per request.
const GAS_PRICE_LINK = 1e9 // LINK per gas unit

const deployMocks: DeployFunction = async function ({
    getNamedAccounts,
    deployments,
}: HardhatRuntimeEnvironment) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (localChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log("Mocks deployed!")
        log("--------------------------------------------------------------------")
    }
}
export default deployMocks
deployMocks.tags = ["all", "mocks"]
