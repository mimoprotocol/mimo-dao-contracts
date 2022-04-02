import { ethers } from "hardhat"
import { expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
const { BigNumber } = ethers
import { increase, duration } from "./utils/time"

import {
    ERC20PICO,
    ERC20PICO__factory,
    VotingEscrow,
    VotingEscrow__factory,
    GaugeController,
    GaugeController__factory,
} from "../typechain"

import { latest } from "./utils/time"

describe("Tokens", function () {
    const WEEK = BigNumber.from(7 * 86400)
    const YEAR = BigNumber.from(365 * 86400)
    let PICO: ERC20PICO
    let vePICO: VotingEscrow
    let admin: SignerWithAddress
    let alice: SignerWithAddress

    before(async function () {
        ;[admin, alice] = await ethers.getSigners()

        const PICOFactory: ERC20PICO__factory =
            <ERC20PICO__factory>await ethers.getContractFactory("ERC20PICO");
    
        PICO = (await PICOFactory.connect(admin).deploy("PICO Protocol", "PICO")) as ERC20PICO

        const vePICOFactory: VotingEscrow__factory =
            <VotingEscrow__factory>await ethers.getContractFactory("VotingEscrow");
        vePICO = (await vePICOFactory.connect(admin).deploy(
            PICO.address,
            "Vote-escrowed PICO",
            "vePICO",
            "vePICO_1.0.0",
        )) as VotingEscrow
    })

    it("check basic info", async function () {
        expect("PICO Protocol").to.equal(await PICO.name())
        expect("Vote-escrowed PICO").to.equal(await vePICO.name())
    })

    it("check create lock", async function () {
        let tx = await PICO.connect(admin).transfer(alice.address, "100000000000000000000")
        let receipt = await tx.wait()
        console.log(tx.gasPrice)
        console.log(tx.gasLimit)
        console.log(receipt.gasUsed)

        await PICO.connect(alice).approve(vePICO.address, "100000000000000000000000")

        const timestamp = await latest();
        tx = await vePICO.connect(alice).create_lock("20000000000000000000", timestamp.add(YEAR))
        receipt = await tx.wait()
        console.log(tx.gasPrice)
        console.log(tx.gasLimit)
        console.log(receipt.gasUsed)
    })

    it("check mint", async function () {
        await expect(
            PICO.mint(alice.address, "1000000")
        ).to.be.revertedWith("ERC20PICO: caller is not the minter")

        await PICO.addMinter(alice.address)
        await expect(
            PICO.connect(alice).mint(alice.address, "1000000")
        ).to.be.revertedWith("ERC20PICO: caller is not the minter")

        await increase(duration.days(3))
        await PICO.connect(alice).mint(alice.address, "1000000")

        expect("80000000000001000000").to.equal(await PICO.balanceOf(alice.address))
    })
})
