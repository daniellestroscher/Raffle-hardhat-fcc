import { ethers } from "ethers"

interface NetworkConfigObject {
    [key: number]: {
        name: string
        vrfCoordinatorV2?: string
        blockConfirmations?: number
        entranceFee: string
        gasLane: string
        subscriptionId?: string
        callbackGasLimit: string
        interval: string
    }
}

export const networkConfig: NetworkConfigObject = {
    31337: {
        name: "localhost",
        entranceFee: ethers.utils.parseEther("0.01").toString(),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", //this value doesn't matter. mocked by hardhat.
        callbackGasLimit: "500000",
        interval: "30",
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        blockConfirmations: 6,
        entranceFee: ethers.utils.parseEther("0.01").toString(),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "2446",
        callbackGasLimit: "500000",
        interval: "30",
    },
}

export const localChains = ["hardhat", "localhost"]
