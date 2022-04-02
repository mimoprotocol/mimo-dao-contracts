import { ethers } from "hardhat";

import { getChainId, loadDeployments, saveDeployments } from "../common";
import {
    deployTokens,
    deployGuageController,
    deployVestingMaster,
    deployVestingMinter,
    addVestingMaster,
} from "./common";

async function main(override: boolean) {
    const chainId = await getChainId();
    const [deployer] = await ethers.getSigners();
    const deployment = loadDeployments(chainId);

    console.log(`Deploying contracts with the account ${deployer.address} on ${chainId} chain`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);

    await deployTokens(deployment, deployer, override);
    await deployGuageController(deployment, deployer, override);
    await deployVestingMaster(deployment, deployer, override);
    await deployVestingMinter(deployment, deployer, override);

    await addVestingMaster(deployment, deployer);

    saveDeployments(chainId, deployment);
}

main(true)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
