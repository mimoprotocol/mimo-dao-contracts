import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
    ERC20PICO,
    ERC20PICO__factory,
    VotingEscrow__factory,
    GaugeController,
    GaugeController__factory,
    VestingMaster,
    VestingMaster__factory,
    VestingMinter,
    VestingMinter__factory,
    Minter,
    Minter__factory,
} from "../../typechain";

import { Deployment } from "../common";

export async function deployTokens(deployment: Deployment, deployer: SignerWithAddress, override = false) {
    if (deployment.ERC20PICO && !override) {
        console.log(`reusing ERC20PICO ${deployment.ERC20PICO}`)
    } else {
        console.log("Deploying ERC20PICO ...");
        const picoFactory: ERC20PICO__factory =
            <ERC20PICO__factory>await ethers.getContractFactory("ERC20PICO");
        const pico = await picoFactory.deploy(
            "Mimo DAO Protocol",
            "PICO"
        );
        await pico.deployed();
        deployment.ERC20PICO = pico.address;
        console.log(
            `contract ERC20PICO deployed at ${pico.address}`
        );
    }
    
    if (deployment.VotingEscrow && !override) {
        console.log(`reusing VotingEscrow ${deployment.VotingEscrow}`)
    } else {
        console.log("Deploying votingEscrow ...");
        const votingEscrowFactory: VotingEscrow__factory =
            <VotingEscrow__factory>await ethers.getContractFactory("VotingEscrow");
        const votingEscrow = await votingEscrowFactory.deploy(
            deployment.ERC20PICO,
            "Vote-escrowed PICO",
            "vePICO",
            "vePICO_1.0.0"
        );
        await votingEscrow.deployed();
        deployment.VotingEscrow = votingEscrow.address;
        console.log(
            `contract votingEscrow deployed at ${votingEscrow.address}`
        );
    }
}

export async function deployGuageController(deployment: Deployment, deployer: SignerWithAddress, override = false) {
    if (deployment.GaugeController && !override) {
        console.log(`reusing GaugeController ${deployment.GaugeController}`)
    } else {
        console.log("Deploying GaugeController ...");
        const gaugeControllerFactory: GaugeController__factory =
            <GaugeController__factory>await ethers.getContractFactory("GaugeController");
        const gaugeController: GaugeController = await gaugeControllerFactory.deploy(
            deployment.ERC20PICO!,
            deployment.VotingEscrow!
        );
        await gaugeController.deployed();
        deployment.GaugeController = gaugeController.address;
        console.log(
            `contract GaugeController deployed at ${gaugeController.address}`
        );

        console.log("Add type for GaugeController ...");    
        let addGaugeTypeTrx = await gaugeController["add_type(string,uint256)"]("Liquidity", ethers.utils.parseEther("10"));
        await addGaugeTypeTrx.wait();
    }
}

export async function deployMinter(deployment: Deployment, deployer: SignerWithAddress, override = false) {
    if (deployment.Minter && !override) {
        console.log(`reusing Minter ${deployment.Minter}`)
    } else {
        console.log("Deploying Minter ...");
        const minterFactory: Minter__factory = <Minter__factory>await ethers.getContractFactory("Minter");
        const minter: Minter = await minterFactory.deploy(deployment.ERC20PICO!, deployment.GaugeController!);
        await minter.deployed();
        deployment.Minter = minter.address;
        console.log(
            `contract Minter deployed at ${minter.address}`
        );

        const picoFactory: ERC20PICO__factory = <ERC20PICO__factory>await ethers.getContractFactory("ERC20PICO__factory");
        const pico: ERC20PICO = picoFactory.attach(deployment.ERC20PICO!);

        let addMinterTrx = await pico.addMinter(minter.address);
        await addMinterTrx.wait();
        console.log(
            `add minter ${minter.address} to PICO ${pico.address}`
        );
    }
}

export async function deployVestingMaster(deployment: Deployment, deployer: SignerWithAddress, override = false) {
    if (deployment.VestingMaster && !override) {
        console.log(`reusing Minter ${deployment.VestingMaster}`)
    } else {
        console.log("Deploying VestingMaster ...");
        const factory: VestingMaster__factory = <VestingMaster__factory>await ethers.getContractFactory("VestingMaster");
        const vesting: VestingMaster = await factory.deploy(86400, 59, deployment.ERC20PICO!);
        await vesting.deployed();
        deployment.VestingMaster = vesting.address;
        console.log(
            `contract VestingMaster deployed at ${vesting.address}`
        );
    }
}

export async function deployVestingMinter(deployment: Deployment, deployer: SignerWithAddress, override = false) {
    if (deployment.Minter && !override) {
        console.log(`reusing Minter ${deployment.Minter}`)
    } else {
        console.log("Deploying Minter ...");
        const minterFactory: VestingMinter__factory = <VestingMinter__factory>await ethers.getContractFactory("VestingMinter");
        const minter: VestingMinter = await minterFactory.deploy(deployment.ERC20PICO!, deployment.GaugeController!, '10000000000000000000');
        await minter.deployed();
        deployment.Minter = minter.address;
        console.log(
            `contract Minter deployed at ${minter.address}`
        );

        const picoFactory: ERC20PICO__factory = <ERC20PICO__factory>await ethers.getContractFactory("ERC20PICO");
        const pico: ERC20PICO = picoFactory.attach(deployment.ERC20PICO!);

        const addMinterTrx = await pico.addMinter(minter.address);
        await addMinterTrx.wait();
        console.log(
            `add minter ${minter.address} to PICO ${pico.address}`
        );

        const updateParameterTrx = await minter.update_mining_parameters();
        await updateParameterTrx.wait();
        console.log(
            `update minter ${minter.address} parameters`
        );
    }
}

export async function addVestingMaster(deployment: Deployment, deployer: SignerWithAddress) {
    const vestingMinterFactory: VestingMinter__factory = <VestingMinter__factory>await ethers.getContractFactory("VestingMinter");
    const minter: VestingMinter = vestingMinterFactory.attach(deployment.Minter!);

    const tx = await minter.set_vesting_master(deployment.VestingMaster!);
    await tx.wait();
    console.log(
        `add VestingMaster ${deployment.VestingMaster} to ${minter.address} vesting master`
    );

    const vestingMasterFactory: VestingMaster__factory = <VestingMaster__factory>await ethers.getContractFactory("VestingMaster");
    const vesting: VestingMaster = await vestingMasterFactory.attach(deployment.VestingMaster!);

    const addLockTx = await vesting.addLocker(deployment.Minter!)
    await addLockTx.wait();
    console.log(
        `set ${minter.address} to VestingMaster ${deployment.VestingMaster} locker`
    );
}
