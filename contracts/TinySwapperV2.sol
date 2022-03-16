// SPDX-License-Identifier: MIT
pragma solidity >=0.8.3;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { IAugustusSwapper } from "./IAugustusSwapper.sol";
import { TinySwapperV1 } from "./TinySwapperV1.sol";
import "hardhat/console.sol";

contract TinySwapperV2 is TinySwapperV1 {
    using SafeMath for uint256;

    IAugustusSwapper public constant swapper = IAugustusSwapper(0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57);

    function swapWithParaswap(bytes calldata _data) external payable {
        (bool success, bytes memory result) = address(swapper).call{value: msg.value}(_data);

        uint received = abi.decode(result, (uint));

        console.log("%s %s", success, received);
    }

}   