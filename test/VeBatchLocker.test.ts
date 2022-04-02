import { ethers } from "hardhat"
import { expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { increase, duration } from "./utils/time"

import {
    ERC20PICO,
    VotingEscrow,
    VeBatchLocker
} from "../typechain"

describe("VeBatchLocker", function () {
    let PICO: ERC20PICO
    let vePICO: VotingEscrow
    let veBatchLocker: VeBatchLocker
    let admin: SignerWithAddress
    let alice: SignerWithAddress

    beforeEach(async function () {
        ;[admin, alice] = await ethers.getSigners()

        // deploy token
        const PICOFactory = await ethers.getContractFactory("ERC20PICO")
        PICO = (await PICOFactory.connect(admin).deploy("PICO Protocol", "PICO")) as ERC20PICO
        const vePICOFactory = await ethers.getContractFactory("VotingEscrow")
        vePICO = (await vePICOFactory.connect(admin).deploy(
            PICO.address,
            "Vote-escrowed PICO",
            "vePICO",
            "vePICO_1.0.0",
        )) as VotingEscrow

        const lockerFactory = await ethers.getContractFactory("VeBatchLocker")
        veBatchLocker = (await lockerFactory.connect(admin).deploy(vePICO.address)) as VeBatchLocker
    })

    it("lock", async () => {
        expect(ethers.utils.parseEther("35000000")).to.equal(await PICO["balanceOf(address)"](admin.address))

        await expect(
            veBatchLocker.connect(admin).lock([alice.address], ["1000000"], 1)
        ).to.be.revertedWith("VeBatchLocker: duration less than a week")
        await expect(
            veBatchLocker.connect(admin).lock([alice.address], ["1000000"], 126144001)
        ).to.be.revertedWith("VeBatchLocker: duration greater than four years")
        await expect(
            veBatchLocker.connect(admin).lock([alice.address], ["1000000"], 126144000)
        ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")

        await PICO.connect(admin).approve(veBatchLocker.address, ethers.utils.parseEther("1"))

        await veBatchLocker.connect(admin).lock([alice.address], ["1000000"], 126144000)

        expect("1000000").to.equals((await vePICO.locked(alice.address)).amount.toString())
        await veBatchLocker.connect(admin).lock([alice.address], ["1000000"], 126144000)
        expect("2000000").to.equals((await vePICO.locked(alice.address)).amount.toString())
    })
})
