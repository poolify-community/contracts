// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
//import "../interfaces/poolify/IStrategy.sol";
import "../interfaces/poolify/IVault.sol";

contract PoolifyHarvestAll is ReentrancyGuard {

    function _harvest(address addr) internal{
        //IStrategy(addr).harvest();
        IVault(addr).deposit(0);
    }

    

    function harvestAll(address[] calldata vaults) public nonReentrant{
        for (uint i = 0; i < vaults.length; i++) {
            _harvest(vaults[i]);
        }
    }
}