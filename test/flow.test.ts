import { ethers } from "hardhat"
import { expect, use } from "chai"
import { solidity } from "ethereum-waffle"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

import {
    ERC20Mock,
    ERC20PICO,
    VotingEscrow,
    GaugeController,
    VestingMinter,
    VestingMaster,
    LiquidityGaugeV3,
} from "../typechain"
import { increase, duration, latest } from "./utils/time"
import { BigNumber } from "ethers"

use(solidity)

describe("Flow", function () {
    let LP: ERC20Mock
    let PICO: ERC20PICO
    let vePICO: VotingEscrow
    let gaugeController: GaugeController
    let vestingMaster: VestingMaster
    let vestingMinter: VestingMinter
    let admin: SignerWithAddress
    let alice: SignerWithAddress
    let bob: SignerWithAddress

    beforeEach(async function () {
        ;[admin, alice, bob] = await ethers.getSigners()

        // deploy LP
        const LPFactory = await ethers.getContractFactory("ERC20Mock");
        LP = (await LPFactory.connect(admin).deploy("Test LP", "TLP")) as ERC20Mock
        await LP.transfer(alice.address, ethers.utils.parseEther("5"));
        await LP.transfer(bob.address, ethers.utils.parseEther("5"));

        // deploy token
        const PICOFactory = await ethers.getContractFactory("ERC20PICO");
        PICO = (await PICOFactory.connect(admin).deploy("Mimo DAO Protocol", "PICO")) as ERC20PICO
        const vePICOFactory = await ethers.getContractFactory("VotingEscrow");

        vePICO = (await vePICOFactory.connect(admin).deploy(
            PICO.address,
            "Vote-escrowed PICO",
            "vePICO",
            "vePICO_1.0.0",
        )) as VotingEscrow

        // deploy controller
        const controllerFactory = await ethers.getContractFactory("GaugeController");
        gaugeController = await controllerFactory.deploy(
            PICO.address,
            vePICO.address
        ) as GaugeController
        await gaugeController["add_type(string,uint256)"]("Liquidity", ethers.utils.parseEther("10"));

        const vestingMasterFactory = await ethers.getContractFactory("VestingMaster");
        vestingMaster = await vestingMasterFactory.deploy(86400, 59, PICO.address) as VestingMaster;
        const vestingMinterFactroy = await ethers.getContractFactory("VestingMinter")
        vestingMinter = await vestingMinterFactroy.deploy(PICO.address, gaugeController.address, ethers.utils.parseEther("10")) as VestingMinter

        await PICO.addMinter(vestingMinter.address);
        await vestingMinter.update_mining_parameters();
        await vestingMinter.set_vesting_master(vestingMaster.address)
        await vestingMaster.addLocker(vestingMinter.address)
    })

    describe("basic flow",async () => {
        it("check add type with zero weight", async function () {
            const gaugeFactory = await ethers.getContractFactory("LiquidityGaugeV3")
            const gauge = await gaugeFactory.deploy(
                LP.address,
                vestingMinter.address,
                admin.address
            ) as LiquidityGaugeV3;
            await gaugeController["add_gauge(address,int128,uint256)"](gauge.address, 0, 0);
    
            await LP.connect(alice).approve(gauge.address, ethers.utils.parseEther("5"))
            await gauge.connect(alice)["deposit(uint256)"](ethers.utils.parseEther("1"))
    
            expect(ethers.utils.parseEther("1")).to.equals(await gauge.balanceOf(alice.address))
    
            await increase(duration.days(7))
    
            expect(0).to.equals(await PICO.balanceOf(alice.address))
            await vestingMinter.connect(alice).mint(gauge.address)
            expect(0).to.equals(await PICO.balanceOf(alice.address))
    
            // create ve lock
            await PICO.connect(admin).transfer(alice.address, ethers.utils.parseEther("100"))
            expect(ethers.utils.parseEther("100")).to.equals(await PICO.balanceOf(alice.address))
            const now = await latest()
            await PICO.connect(alice).approve(vePICO.address, ethers.utils.parseEther("100"))
            await vePICO.connect(alice).create_lock(ethers.utils.parseEther("50"), now.add(86400 * 365))
            expect(ethers.utils.parseEther("50")).to.equals(await PICO.balanceOf(alice.address))
            expect(0).to.be.lt(await vePICO["balanceOf(address)"](alice.address))
    
            // voting gauge
            await expect(
                gaugeController.connect(bob).vote_for_gauge_weights(gauge.address, 10000)
            ).to.be.revertedWith("Your token lock expires too soon")
            await gaugeController.connect(alice).vote_for_gauge_weights(gauge.address, 10000)
            let alicePICOBalance = await PICO.balanceOf(alice.address)
            expect(ethers.utils.parseEther("50")).to.equals(alicePICOBalance)
            await vestingMinter.connect(alice).mint(gauge.address)
            alicePICOBalance = await PICO.balanceOf(alice.address)
            expect(ethers.utils.parseEther("50")).to.equals(alicePICOBalance)
    
            // harvest
            await increase(duration.days(7))
            await vestingMinter.connect(alice).mint(gauge.address)
            alicePICOBalance = await PICO.balanceOf(alice.address)
            expect(ethers.utils.parseEther("50")).to.lt(alicePICOBalance)
        })
    })

    describe("check minter flow", async () => {
        let alicePICOBalance: BigNumber
        let alicevePICOLocked: BigNumber
        let gauge: LiquidityGaugeV3

        beforeEach(async () => {
            const gaugeFactory = await ethers.getContractFactory("LiquidityGaugeV3")
            gauge = await gaugeFactory.deploy(
                LP.address,
                vestingMinter.address,
                admin.address
            ) as LiquidityGaugeV3;
            await gaugeController["add_gauge(address,int128,uint256)"](gauge.address, 0, 0);

            await LP.connect(alice).approve(gauge.address, ethers.utils.parseEther("5"))
            await gauge.connect(alice)["deposit(uint256)"](ethers.utils.parseEther("1"))

            // create ve lock
            await PICO.connect(admin).transfer(alice.address, ethers.utils.parseEther("100"))
            const now = await latest()
            await PICO.connect(alice).approve(vePICO.address, ethers.utils.parseEther("100"))
            await vePICO.connect(alice).create_lock(ethers.utils.parseEther("50"), now.add(86400 * 365))

            await gaugeController.connect(alice).vote_for_gauge_weights(gauge.address, 10000)

            await vestingMinter.connect(admin).set_compound_parameters(vePICO.address, duration.days(30))
            
            await increase(duration.days(7))
        })

        it("check vesting master change to compound mint", async () => {
            let [aliceLockedAmount, aliceClaimableAmount] = await vestingMaster.getVestingAmount(alice.address)
            expect(0).to.equals(aliceLockedAmount)
            expect(0).to.equals(aliceClaimableAmount)

            await vestingMinter.connect(alice).mint(gauge.address)

            alicePICOBalance = await PICO.balanceOf(alice.address)
            expect(ethers.utils.parseEther("50")).to.lt(alicePICOBalance)

            ;[aliceLockedAmount, aliceClaimableAmount] = await vestingMaster.getVestingAmount(alice.address)
            expect(0).to.lt(aliceLockedAmount)
            expect(0).to.equals(aliceClaimableAmount)

            expect(false).to.equals(await vestingMinter.compound_user(alice.address))
            await vestingMinter.connect(alice).register_compound()
            expect(true).to.equals(await vestingMinter.compound_user(alice.address))

            alicePICOBalance = await PICO.balanceOf(alice.address)
            ;[alicevePICOLocked] = await vePICO.locked(alice.address)
            expect(ethers.utils.parseEther("50")).to.equals(alicevePICOLocked)

            await vestingMinter.connect(alice).mint(gauge.address)

            let [newAliceLockedAmount, newAliceClaimableAmount] = await vestingMaster.getVestingAmount(alice.address)
            expect(aliceLockedAmount).to.equals(newAliceLockedAmount)
            expect(aliceClaimableAmount).to.equals(newAliceClaimableAmount)

            let [newAlicevePICOLocked] = await vePICO.locked(alice.address)
            expect(newAlicevePICOLocked).to.gt(alicevePICOLocked)
        })

        it("check compound mint", async () => {
            await LP.connect(bob).approve(gauge.address, ethers.utils.parseEther("5"))
            await gauge.connect(bob)["deposit(uint256)"](ethers.utils.parseEther("1"))

            let bobPICOBalance = await PICO.balanceOf(bob.address)
            let [bobvePICOLocked] = await vePICO.locked(bob.address)
            expect(0).to.equals(bobPICOBalance)
            expect(0).to.equals(bobvePICOLocked)

            await vestingMinter.connect(bob).register_compound()

            await vestingMinter.connect(bob).mint(gauge.address)
            bobPICOBalance = await PICO.balanceOf(bob.address)
            ;[bobvePICOLocked] = await vePICO.locked(bob.address)
            expect(0).to.equals(bobPICOBalance)
            expect(0).to.lt(bobvePICOLocked)
        })
    })
})
