pragma solidity >= 0.8.0 < 0.9.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Realcees is ERC20 {
    constructor() ERC20("Realcees", "RLCs") {
        _mint(msg.sender, 1000 ether);
    }
}