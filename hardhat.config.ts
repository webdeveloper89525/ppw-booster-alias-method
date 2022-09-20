import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-truffle5";
import "solidity-coverage";

dotenv.config();

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const MATIC_VIGIL_PROJECT_ID = process.env.MATIC_VIGIL_PROJECT_ID;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BSC_API = process.env.BSC_API;

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [`0x${PRIVATE_KEY}`],
    },
/*     rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      // gasPrice: 45000000000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      // gasPrice: 45000000000,
    },
    mumbai: {
      url: `https://rpc-mumbai.maticvigil.com/v1/${MATIC_VIGIL_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    matic: {
      url: `https://rpc-mainnet.maticvigil.com/v1/${MATIC_VIGIL_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    } */
  },

  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  mocha: {
    timeout: 800000,
  },

  contractSizer: {
    alphaSort: false,
    runOnCompile: true,
    disambiguatePaths: false,
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
