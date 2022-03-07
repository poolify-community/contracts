// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockERC20 is ERC20,Ownable {

    receive() external payable {
        _mint(msg.sender, msg.value);
    }

    constructor(string memory name,string memory symbol,uint256 supply) ERC20(name, symbol) {
        //_mint(msg.sender, supply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
}