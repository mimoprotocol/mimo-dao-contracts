import { ethers } from "hardhat";

import { getChainId, loadDeployments, saveDeployments } from "../common";
import { deployTokens } from "./common";

async function main() {
    const chainId = await getChainId();
    const [deployer] = await ethers.getSigners();
    const deployment = loadDeployments(chainId);

    console.log(`Deploying tokens contracts with the account ${deployer.address} on ${chainId} chain`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);

    await deployTokens(deployment, deployer, false);

    saveDeployments(chainId, deployment);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
