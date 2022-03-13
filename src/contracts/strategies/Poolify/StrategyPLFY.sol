// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;
pragma experimental ABIEncoderV2;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./StratManagerPLFY.sol";
import "./FeeManagerPLFY.sol";
import "../../protocol/PoolifyRewardManager.sol";

contract StrategyPLFY is StratManagerPLFY, FeeManagerPLFY {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address constant nullAddress = address(0);

    // Tokens used
    address public want;

    // Third party contracts
    address public rewardManager;


    /**
     * @dev Event that is fired each time someone harvests the strat.
     */
    event StratHarvest(address indexed harvester, uint256 indexed timestamp);

    constructor(
        address _want,
        address _rewardManager,
        address _vault,
        address _keeper,
        address _poolifyFeeRecipient
    ) StratManagerPLFY(_keeper, _vault, _poolifyFeeRecipient) {
        rewardManager = _rewardManager;
        want = _want;
        _giveAllowances();
    }

    function deposit() public whenNotPaused {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        PoolifyRewardManager(rewardManager).deposit(0,wantBal);
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal < _amount) {
            PoolifyRewardManager(rewardManager).withdraw(0,_amount.sub(wantBal));
            wantBal = IERC20(want).balanceOf(address(this));
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin == owner() || paused()) {
            IERC20(want).safeTransfer(vault, wantBal);
        } else {
            uint256 withdrawalFeeAmount = wantBal.mul(withdrawalFee).div(WITHDRAWAL_MAX);
            IERC20(want).safeTransfer(vault, wantBal.sub(withdrawalFeeAmount));
        }
    }

    // We harvest every time we do a deposit
    function beforeDeposit() external override {
        harvest();
    }

    // compounds earnings and charges performance fee
    function harvest() public whenNotPaused {
        require(tx.origin == msg.sender || msg.sender == vault, "!contract");

        uint256 wantBal = PoolifyRewardManager(rewardManager).pendingPoolify(0,address(this));
    
        if (wantBal > 0) {
            //chargeFees();
            deposit();
            emit StratHarvest(msg.sender, block.timestamp);
        }
    }

    // performance fees
    function chargeFees() internal {

        uint256 balance = IERC20(want).balanceOf(address(this));

        uint256 _callFeeAmount = balance.mul(callFee).div(MAX_FEE);
        IERC20(want).safeTransfer(tx.origin, _callFeeAmount);

        uint256 _plfyFeeAmount = balance.mul(plfyFee).div(MAX_FEE);
        IERC20(want).safeTransfer(poolifyFeeRecipient, _plfyFeeAmount);
        
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 _amount,) = PoolifyRewardManager(rewardManager).userInfo(0, address(this));
        return _amount;
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        PoolifyRewardManager(rewardManager).emergencyWithdraw(0);

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        PoolifyRewardManager(rewardManager).emergencyWithdraw(0);
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(address(rewardManager), type(uint256).max);
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(address(rewardManager), 0);
    }
}
