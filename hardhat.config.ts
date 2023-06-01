import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-deploy"
import "hardhat-contract-sizer"
import "dotenv/config"

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x123"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "apiKey"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "apiKey"

const config: HardhatUserConfig = {
    solidity: {
        compilers: [{ version: "0.8.18" }, { version: "0.8.0" }],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
        },
    },
    gasReporter: {
        enabled: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "ETH",
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1337: 0, //<-use chain id to tell which network the use the 0th account as deployer.
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 400000, //400 seconds max
    },
}

export default config
