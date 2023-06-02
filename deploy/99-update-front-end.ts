import { DeployFunction } from "hardhat-deploy/dist/types"
import { ethers, network } from "hardhat"
import fs from "fs"

const FRONT_END_ADDRESSES_FILE = "../nextjs-raffle-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_FILE_RAFFLE = "../nextjs-raffle-fcc/constants/raffleAbi.json"

const UpdateFrontEnd: DeployFunction = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        updateContractAddresses()
        updateRaffleAbi()
    }
    async function updateRaffleAbi() {
        const raffle = await ethers.getContract("Raffle")
        fs.writeFileSync(
            FRONT_END_ABI_FILE_RAFFLE,
            raffle.interface.format(ethers.utils.FormatTypes.json) as string
        )
    }

    async function updateContractAddresses() {
        const raffle = await ethers.getContract("Raffle")
        const chainId = network.config.chainId!.toString()
        const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
        if (chainId in currentAddresses) {
            if (!currentAddresses[chainId].includes(raffle.address)) {
                currentAddresses[chainId].push(raffle.address)
            }
        } else {
            currentAddresses[chainId] = [raffle.address]
        }
        fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
    }
}
export default UpdateFrontEnd
UpdateFrontEnd.tags = ["all", "frontend"]
