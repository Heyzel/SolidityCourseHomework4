// SPDX-License-Identifier: MIT
pragma solidity >=0.8.3;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAugustusSwapper } from "./IAugustusSwapper.sol";
import { TinySwapperV1 } from "./TinySwapperV1.sol";

contract TinySwapperV2 is TinySwapperV1 {
    using SafeMath for uint256;

    IAugustusSwapper public constant swapper = IAugustusSwapper(0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57);

    /**
    * @notice Swap tokens according to the percentages in `_percentages`
    * @dev The tokens are sends to contract and the contract send tokebs to msg.sender.
    * The percentages have 2 decimals precision (i.e. 5000 = 50%, 6415 = 64.15%)
    * @param `_data` is the data for do the swap with the paraswap contract, `_percentages` are
    * the percentages of eth that will be invested in each token, `_tokens` are the addresses
    * of the tokens that will be swapped
    */
    function swapWithParaswap(
        bytes[] calldata _data, 
        uint16[] memory _percentages, 
        address[] memory _tokens) 
        external payable {
        require(msg.value > 0, "Insufficient ETH");
        require(_data.length == _percentages.length && _data.length == _tokens.length, "Tokens and percentages does not have the same size");

        // Calculate ETH to make the swaps
        uint moneyToSwap = msg.value.sub(msg.value.mul(fee).div(10000));
        uint amount;

        for(uint i = 0; i < _data.length; i++){
            // Calculate the ETH desired to the swap for that token
            amount = moneyToSwap.mul(_percentages[i]).div(10000);

            // Swap the tokens
            (bool success, bytes memory result) = address(swapper).call{value: amount}(_data[i]);

            require(success, "Error swapping the tokens");

            // Send tokens to sender
            IERC20 token = IERC20(_tokens[i]);
            (bool success2) = token.transfer(msg.sender, token.balanceOf(address(this)));

            require(success2, "Error in the tokens transfer");

            emit SwapSuccess(amount, token.balanceOf(address(this)), _tokens[i]);
        }
        // Send fee to `feeRecipient`
        (bool sc, ) = feeRecipient.call{ value: (address(this).balance) }("");
        require(sc, "refund failed");        
    }

}   