const { ParaSwap } = require('paraswap');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { GetGas } = require('hardhat-gas-trackooor/dist/src/GetGas');
//const { ethers } = require('ethers');
const { fixture } = deployments;

const paraSwap = new ParaSwap();
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const LINK_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const USDT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7";

describe('TinySwapperV1 contract', () => {
    before(async function(){
        ({ deployer, feeRecipient, buyer} = await getNamedAccounts());

        deployerSigner = await ethers.provider.getSigner(deployer);
        feeRecipientSigner = await ethers.provider.getSigner(feeRecipient);
        buyerSigner = await ethers.provider.getSigner(buyer);

        // Deploy
        await fixture(["TinySwapperV1"]);
        app = await ethers.getContract("TinySwapperV1");

    });

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            expect(await app.owner()).to.equal(deployerSigner._address);
        });
    });

    describe('Tests for functions', () => {
        describe('Tests for setFeeRecipient', () => {
            it('Should set the feeRecipient', async () => {
                await app.connect(deployerSigner).setFeeRecipient(feeRecipientSigner._address);
                expect(await app.feeRecipient()).to.equal(feeRecipientSigner._address);
            });
        });

        describe('Tests for setFee', () => {
            it('Should fail if fee is equal or less than 0 or greater than 10000', async () => {
                await expect(app.connect(deployerSigner).setFee(0)).to.be.revertedWith("Invalid fee");
                await expect(app.connect(deployerSigner).setFee(10000)).to.be.revertedWith("Invalid fee");
            });

            it('Should set the fee', async () => {
                await app.connect(deployerSigner).setFee(100) // fee = 100 is 1%
                expect(await app.fee()).to.equal(100);
            });
        });

        describe('Tests for swap', () => {
            it('Should fail if msg.value is 0', async () => {
                tokens = [DAI_ADDRESS, LINK_ADDRESS, USDT_ADDRESS];
                percentages = [3000, 3000, 4000];
                await expect(app.connect(buyerSigner).swap(tokens, percentages)).to.be.revertedWith("Insufficient ETH");
            });

            it('Should fail if tokens and percentages does not have same length', async () => {
                tokens = [DAI_ADDRESS, LINK_ADDRESS, USDT_ADDRESS];
                percentages = [2500, 2500, 2500, 2500];
                await expect(app.connect(buyerSigner).swap(tokens, percentages, {value: ethers.utils.parseEther("1")}))
                .to.be.revertedWith("Tokens and percentages does not have the same size");
            });

            it('Should swap eth to tokens', async () => {
                await app.connect(deployerSigner).setFee(10);
                const IERC20 = require("../abi/ERC20.json");
                tokens = [DAI_ADDRESS, LINK_ADDRESS, USDT_ADDRESS];
                percentages = [2500, 5000, 2500];
                const dai = await hre.ethers.getContractAt(IERC20, DAI_ADDRESS);
                const link = await hre.ethers.getContractAt(IERC20, LINK_ADDRESS);
                const usdt = await hre.ethers.getContractAt(IERC20, USDT_ADDRESS);
                const daiBefore = parseInt(await dai.balanceOf(buyerSigner._address));
                const linkBefore = parseInt(await link.balanceOf(buyerSigner._address));
                const usdtBefore = parseInt(await usdt.balanceOf(buyerSigner._address));
                const feeRecipientBalanceBefore = parseInt(await ethers.provider.getBalance(feeRecipientSigner._address));

                await app.connect(buyerSigner).swap(tokens, percentages, {value: ethers.utils.parseEther("100")});

                expect(parseInt(await ethers.provider.getBalance(feeRecipientSigner._address)))
                .to.be.equal(feeRecipientBalanceBefore + (parseInt(ethers.utils.parseEther("100"))) * 0.001);

                expect(parseInt(await dai.balanceOf(buyerSigner._address))).to.be.greaterThan(daiBefore);
                expect(parseInt(await link.balanceOf(buyerSigner._address))).to.be.greaterThan(linkBefore);
                expect(parseInt(await usdt.balanceOf(buyerSigner._address))).to.be.greaterThan(usdtBefore);
                
            });
        });
    });

    describe('Upgrading TinySwapper', () => {
        let appV2;

        beforeEach(async () => {
            await fixture(['TinySwapperV2']);
            appV2 = await ethers.getContract('TinySwapperV1', await app.owner());
        });

        describe("Deployment", () => {
            it('Should set the right owner', async () => {
                expect(await appV2.owner()).to.be.equal(deployerSigner._address);
            });
        });
    });
});