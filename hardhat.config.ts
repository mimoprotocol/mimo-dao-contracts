import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import "@nomiclabs/hardhat-vyper";
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.11',
        settings: {
            optimizer: {
                enabled: true,
                runs: 800,
            },
            metadata: {
                bytecodeHash: 'none',
            },
        },
    },
    vyper: {
        version: "0.2.16",
    },
    networks: {
        hardhat: {
        },
        kovan: {
            url: `https://kovan.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
        },
        iotex: {
            url: 'https://babel-api.mainnet.iotex.io',
            accounts: [`0x${process.env.PRIVATE_KEY}`],
            chainId: 4689,
        },
        iotex_test: {
            url: 'https://babel-api.testnet.iotex.io',
            accounts: [`0x${process.env.PRIVATE_KEY}`],
            chainId: 4690,
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY
    },
    gasReporter: {
        currency: 'USD',
        coinmarketcap: process.env.CMC_API_KEY || undefined,
        enabled: !!process.env.REPORT_GAS,
        showTimeSpent: true,
    },
    typechain: {
        outDir: "typechain"
    },
    mocha: {
        timeout: 200000
    }
};

export default config;