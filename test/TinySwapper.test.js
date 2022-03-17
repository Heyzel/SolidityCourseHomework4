const { ParaSwap } = require('paraswap');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { GetGas } = require('hardhat-gas-trackooor/dist/src/GetGas');
//const { ethers } = require('ethers');
const { fixture } = deployments;

const paraSwap = new ParaSwap(1); 
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

        describe('Tests for ParaSwap', () => {
            it('Should swap tokens with the best DEX', async () => {
    
                const tokens = await paraSwap.getTokens();

                const accountImpersonate = '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8';
    
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [accountImpersonate],
                });
                
                const impersonateSigner = await ethers.getSigner(accountImpersonate);
    
                const usrAddress = impersonateSigner.address;
                const from = tokens[0].address;
                const to = tokens[7].address;
                const to2 = tokens[5].address;
                const _amount = '1000000000000000000';

                /**
                * @notice This code is commented because sometimes de API does not works,
                * so I use the transaction objects that I get when the API works
                * @dev The parameters for these objects are srcToken = ETH address, destToken = AAVE address, 
                * srcAmount = 1000000000000000000 (1 ETH) for the txObjectAux, and srcToken = ETH address,
                * destToken = DAI address, srcAmount = 1000000000000000000 (1 ETG) for the txObjectAux2
                */

                /*
                const priceRoute = await paraSwap.getRate(from, to, _amount, usrAddress);
                const priceRoute2 = await paraSwap.getRate(from, to2, _amount, usrAddress);

                const minAmount = priceRoute.destAmount * (1 - 1/100).toFixed(0);
                const minAmount2 = priceRoute2.destAmount * (1 - 1/100).toFixed(0);
                
                const txObject = await paraSwap.buildTx(
                    from,
                    to,
                    _amount,
                    minAmount,
                    priceRoute,
                    usrAddress,
                    'ignoreChecks=true&ignoreGasEstimate=true'
                );

                const txObject2 = await paraSwap.buildTx(
                    from,
                    to2,
                    _amount,
                    minAmount2,
                    priceRoute2,
                    usrAddress,
                    'ignoreChecks=true&ignoreGasEstimate=true'
                );
                */

                const txObjectAux = {
                    from: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
                    to: '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57',
                    value: '1000000000000000000',
                    data: '0x64466805000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000007fc66500c84a76ad7e9c93437bfc5ac33e2ddae90000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000001164889cbdbe05000000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000007fc66500c84a76ad7e9c93437bfc5ac33e2ddae9000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000011921ecb370a03cf80000000000000000000000000000000000000000000000000e043da61725000000000000000000000000000056178a0d5f301baf6cf3e1cd53d9863437345bf9000000000000000000000000def171fe48cf0115b1d80b88dc8eab59176fee57000000000000000000000000ea674fdde714fd979de3edf0f56aa9716b898ec80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006232b19201ffffffffffffffffffffffffffffffffffffff14e3c5816232b1380000002b0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001b3cbb03c256935f896e9eb78d77af1a06de2a570520a96e7b4dfd10cc95473ee66d5223a825ceef73cb89f6ba8441dd9bfe66394721920a4300a258135f48ff03',
                    gasPrice: '22000000000',
                    gas: '494337',
                    chainId: 1
                  }

                const txObjectAux2 = {
                    from: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
                    to: '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57',
                    value: '1000000000000000000',
                    data: '0x0b86a4c1000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000a4ad00ed000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000004de5a478c2975ab1ea89e8196811f51a7b7ade33eb11',
                    gasPrice: '33000000000',
                    gas: '144051',
                    chainId: 1
                  }

                const IERC20 = require("../abi/ERC20.json");
                const toContract = await hre.ethers.getContractAt(IERC20, to);
                const to2Contract = await hre.ethers.getContractAt(IERC20, to2);

                const toContractBalanceBefore = parseInt(await toContract.balanceOf(usrAddress));
                const to2ContractBalanceBefore = parseInt(await to2Contract.balanceOf(usrAddress));
                console.log("Balance of first token before swap: " + toContractBalanceBefore + ", Balance of second token before swap: " + to2ContractBalanceBefore);

                const data = [txObjectAux.data, txObjectAux2.data];
                const percentages = [5000, 5000];
                const _tokens = [to, to2];

                await appV2.connect(impersonateSigner).swapWithParaswap(data, percentages, _tokens, {value: ethers.utils.parseEther("2.002002002002002002")});
                
                const toContractBalanceAfter = parseInt(await toContract.balanceOf(usrAddress));
                const to2ContractBalanceAfter = parseInt(await to2Contract.balanceOf(usrAddress));
                console.log("Balance of first token after swap: " + toContractBalanceAfter + ", Balance of second token after swap: " + to2ContractBalanceAfter);

                expect(toContractBalanceAfter).to.be.greaterThan(toContractBalanceBefore);
                expect(to2ContractBalanceAfter).to.be.greaterThan(to2ContractBalanceBefore);
            });
        });   
    });
});