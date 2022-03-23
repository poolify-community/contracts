// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @dev Implementation of a vault to deposit funds for yield optimizing.
 * This is the contract that receives funds and that users interface with.
 * The yield optimizing strategy itself is implemented in a separate 'Strategy.sol' contract.
 */
contract TestRequestPoolify is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct UserInfo {
        uint256 amount; //How many token requested in total
        uint256 lastRequest; // Reward debt. See explanation below.
    }
    uint256 public immutable ACC_PLFY_PRECISION = 1e18;
    uint256 public immutable requestDelay = 21600; // 6h
    uint256 public immutable tokenSizeRequest = 10000;

    address PLFYToken;

    
    mapping (address => UserInfo) public userInfo;


    constructor (address _PLFYToken){
        PLFYToken = _PLFYToken;
    }


    function balance() public view returns (uint) {
        return IERC20(PLFYToken).balanceOf(address(this));
    }

    function isRequestAvailable() public view returns (bool) {
        UserInfo storage user = userInfo[msg.sender];
        return block.timestamp - requestDelay > user.lastRequest;
    }
    

    function request() public {
        UserInfo storage user = userInfo[msg.sender];

        if(block.timestamp - requestDelay > user.lastRequest){
            uint256 toRequest = tokenSizeRequest.mul(ACC_PLFY_PRECISION);
            IERC20(PLFYToken).safeTransfer(msg.sender,toRequest);
            user.amount = user.amount + toRequest;
            user.lastRequest = block.timestamp;
        }
    }
}
