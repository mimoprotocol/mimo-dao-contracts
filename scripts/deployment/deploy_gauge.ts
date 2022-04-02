import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
    LiquidityGaugeV3__factory,
    GaugeController,
    GaugeController__factory,
} from "../../typechain";

import { getChainId, loadDeployments, saveDeployments } from "../common";

async function main() {
    const chainId = await getChainId();
    const [deployer] = await ethers.getSigners();
    const deployment = loadDeployments(chainId);

    console.log(`Deploying contracts with the account ${deployer.address} on ${chainId} chain`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);

    const gaugeFactory: LiquidityGaugeV3__factory =
        <LiquidityGaugeV3__factory>await ethers.getContractFactory("LiquidityGaugeV3");
    const gauge = await gaugeFactory.deploy(
        process.env.LP_TOKEN,
        deployment.Minter!,
        deployer.address
    );
    await gauge.deployed();

    deployment.Gauges.push({token: process.env.LP_TOKEN, address: gauge.address});

    const gaugeControllerFactory: GaugeController__factory =
        <GaugeController__factory>await ethers.getContractFactory("GaugeController");
    const gaugeController: GaugeController = gaugeControllerFactory.attach(deployment.GaugeController!);

    let trx = await gaugeController["add_gauge(address,int128,uint256)"](gauge.address, 0, 1);
    await trx.wait();

    saveDeployments(chainId, deployment);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

