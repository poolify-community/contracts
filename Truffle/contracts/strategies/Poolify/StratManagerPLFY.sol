// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract StratManagerPLFY is Ownable, Pausable {
    /**
     * @dev Poolify Contracts:
     * {keeper} - Address to manage a few lower risk features of the strat
     * {vault} - Address of the vault that controls the strategy's funds.
     */
    address public keeper;
    address public vault;
    address public poolifyFeeRecipient;

    /**
     * @dev Initializes the base strategy.
     * @param _keeper address to use as alternative owner.
     * @param _vault address of parent vault.
     * @param _poolifyFeeRecipient address where to send Poolify's fees.
     */
    constructor(
        address _keeper,
        address _vault,
        address _poolifyFeeRecipient
    ){
        keeper = _keeper;
        vault = _vault;
        poolifyFeeRecipient = _poolifyFeeRecipient;
    }

    // checks that caller is either owner or keeper.
    modifier onlyManager() {
        require(msg.sender == owner() || msg.sender == keeper, "!manager");
        _;
    }

    /**
     * @dev Updates address of the strat keeper.
     * @param _keeper new keeper address.
     */
    function setKeeper(address _keeper) external onlyManager {
        keeper = _keeper;
    }

    /**
     * @dev Updates parent vault.
     * @param _vault new vault address.
     */
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }

    /**
     * @dev Updates Poolify fee recipient.
     * @param _poolifyFeeRecipient new Poolify fee recipient address.
     */
    function setpoolifyFeeRecipient(address _poolifyFeeRecipient) external onlyOwner {
        poolifyFeeRecipient = _poolifyFeeRecipient;
    }

    /**
     * @dev Function to synchronize balances before new user deposit.
     * Can be overridden in the strategy.
     */
    function beforeDeposit() external virtual {}
}