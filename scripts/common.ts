import { ethers } from "hardhat";
import * as fs from "fs";

export interface Deployment {
    ERC20PICO?: string,
    VotingEscrow?: string
    GaugeController?: string
    Gauges: Array<{token: string, address: string}>
    SmartWalletChecker?: string
    VestingMaster?: string
    Minter?: string
}

export function loadDeployments(chainId: number): Deployment {
    if (fs.existsSync(`./deployments/contracts-${chainId}.json`)) {
        return JSON.parse(fs.readFileSync(`./deployments/contracts-${chainId}.json`).toString());
    } else {
        const deployment: Deployment = {
            Gauges: []
        };
        return deployment;
    }
}

export function saveDeployments(chainId: number, deployment: Deployment) {
    if(!fs.existsSync("./deployments")) {
        fs.mkdirSync("./deployments");
    }
    fs.writeFileSync(`./deployments/contracts-${chainId}.json`, JSON.stringify(deployment, null, 4));
}

export async function getChainId(): Promise<number> {
    const { chainId } = await ethers.provider.getNetwork();
    return chainId;
}
