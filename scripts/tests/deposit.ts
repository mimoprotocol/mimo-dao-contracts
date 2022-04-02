import { ethers } from "hardhat";
import {
    LiquidityGaugeV3,
    LiquidityGaugeV3__factory,
    GaugeController,
    GaugeController__factory,
} from "../../typechain";
import { getChainId, loadDeployments } from "../common";

async function main() {
    const chainId = await getChainId();
    const [deployer] = await ethers.getSigners();
    const deployment = loadDeployments(chainId);

    const gaugeFactory: LiquidityGaugeV3__factory =
        <LiquidityGaugeV3__factory>await ethers.getContractFactory("LiquidityGaugeV3");
    const gauge: LiquidityGaugeV3 = gaugeFactory.attach(deployment.Gauges[0].address);

    const amount = "10000000000000000000";
    let tx = await gauge["deposit(uint256)"](amount)
    await tx.wait();
    console.log(`Deposit ${amount} to gauge ${deployment.Gauges[0].address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
