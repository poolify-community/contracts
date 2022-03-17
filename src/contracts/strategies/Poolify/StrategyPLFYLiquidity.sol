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

contract StrategyPLFYLiquidity is StratManagerPLFY, FeeManagerPLFY {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address constant nullAddress = address(0);

    // Tokens used
    address public want;
    address public reward;

    // Third party contracts
    address public rewardManager;


    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    uint256 public poolRewardId;


    /**
     * @dev Event that is fired each time someone harvests the strat.
     */
    event StratHarvest(address indexed harvester, uint256 indexed timestamp);

    constructor(
        address _want,
        address _reward,
        address _rewardManager,
        uint256 _poolRewardId,
        address _vault,
        address _keeper,
        address _strategistRecipient
    ) StratManagerPLFY(_keeper, _vault, _strategistRecipient) {
        rewardManager = _rewardManager;
        reward = _reward;
        poolRewardId  = _poolRewardId;
        want = _want;
        _giveAllowances();
    }

    function deposit() public whenNotPaused {
        uint256 wantBal = balanceOfWant();
        if(wantBal > 0){
            PoolifyRewardManager(rewardManager).deposit(poolRewardId,wantBal);
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");
        uint256 wantBal = balanceOfWant();

        if (wantBal < _amount) {
            PoolifyRewardManager(rewardManager).withdraw(poolRewardId,_amount.sub(wantBal));
            wantBal = balanceOfWant();
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }
        
        IERC20(reward).safeTransfer(vault,balanceOfReward());
        IERC20(want).safeTransfer(vault, wantBal);
    }

    // We harvest every time we do a deposit
    function beforeDeposit() external override {
        require(msg.sender == vault, "!vault");
        _harvest(tx.origin);
    }

    function harvest() external {
        _harvest(tx.origin);
    }

    function harvest(address callFeeRecipient) external {
        _harvest(callFeeRecipient);
    }


    function managerHarvest() external onlyManager {
        _harvest(tx.origin);
    }

    // compounds earnings and charges performance fee
    function _harvest(address callFeeRecipient) internal whenNotPaused {
        require(tx.origin == msg.sender || msg.sender == vault, "!contract");
        
        uint256 pendingBal = balanceOfPendingRewards();
        // Withdraw pendingBal
        PoolifyRewardManager(rewardManager).withdraw(poolRewardId,pendingBal);
        if (pendingBal > 0) {
            chargeStrategistFees(pendingBal);
            lastHarvest = block.timestamp;
            IERC20(reward).safeTransfer(vault,balanceOfReward());
        }
    }


    // Charge Strategist fees
    function chargeStrategistFees(uint256 pendingBal) internal {
        uint256 _strategistFeeAmount = pendingBal.mul(STRATEGIST_FEE).div(CALL_PRECISION);
        IERC20(reward).safeTransfer(strategistRecipient, _strategistFeeAmount);
    }

    // calculate the total 'pending rewards'.
    function balanceOfPendingRewards() public view returns (uint256){
        return PoolifyRewardManager(rewardManager).pendingPoolify(poolRewardId,address(this));
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'reward' this contract holds.
    function balanceOfReward() public view returns (uint256) {
        return IERC20(reward).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 _amount,) = PoolifyRewardManager(rewardManager).userInfo(poolRewardId, address(this));
        return _amount;
    }


    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        PoolifyRewardManager(rewardManager).emergencyWithdraw(poolRewardId);

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        PoolifyRewardManager(rewardManager).emergencyWithdraw(poolRewardId);
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
