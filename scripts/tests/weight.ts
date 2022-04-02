import { ethers } from "hardhat";
import {
    GaugeController,
    GaugeController__factory,
} from "../../typechain";
import { getChainId, loadDeployments } from "../common";

async function main() {
    const chainId = await getChainId();
    const [deployer] = await ethers.getSigners();
    const deployment = loadDeployments(chainId);

    const gaugeFactory: GaugeController__factory =
        <GaugeController__factory>await ethers.getContractFactory("GaugeController");
    const controller: GaugeController = gaugeFactory.attach(deployment.GaugeController);

    const weight = await controller["gauge_relative_weight(address)"]("0x636112A5c06ac009d8D80B7e64D71Cb25a14f234");
    const total = await controller.get_total_weight();

    console.log(weight.toString());
    console.log(total.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
