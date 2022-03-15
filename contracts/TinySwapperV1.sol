// SPDX-License-Identifier: MIT
pragma solidity >=0.8.3;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract TinySwapperV1 is OwnableUpgradeable  {
    using SafeMath for uint256;
    
    address public feeRecipient;
    uint16 public fee;
    ISwapRouter public constant swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    address private constant WETH9 = 0xd0A1E359811322d97991E03f863a0C30C2cF029C;

    function initialize(address _feeRecipient, uint16 _fee) external initializer {
        require(_feeRecipient != address(0));
        require(_fee > 0);
        feeRecipient = _feeRecipient;
        fee = _fee;
    }

    function swap(address[] memory _tokens, uint[] memory _percentages) external payable {
        require(msg.value > 0, "Insufficient ETH");
        require(_tokens.length == _percentages.length, "tokens and percentages does not have the same size");

        uint moneyToSwap = msg.value.sub(msg.value.mul(fee).div(10000));
        uint amount; uint amountOut;

        for(uint i = 0; i < _tokens.length; i++){
            amount = moneyToSwap.mul(_percentages[i]).div(10000);
            ISwapRouter.ExactInputSingleParams memory params = 
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: _tokens[i],
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp + 1,
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

            amountOut = swapRouter.exactInputSingle{value: amount}(params);

        }

        (bool success, ) = feeRecipient.call{ value: (address(this).balance) }("");
        require(success, "refund failed");
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    function setFee(uint16 newFee) external onlyOwner {
        require(newFee > 0 && newFee < 10000, "Invalid fee");
        fee = newFee;
    }

}