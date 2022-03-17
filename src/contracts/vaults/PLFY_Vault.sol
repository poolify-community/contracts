// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../interfaces/poolify/IStrategy.sol";

/**
 * @dev Implementation of a vault to deposit funds for yield optimizing.
 * This is the contract that receives funds and that users interface with.
 * The yield optimizing strategy itself is implemented in a separate 'Strategy.sol' contract.
 */
contract PLFY_Vault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct StratCandidate {
        address implementation;
        uint proposedTime;
    }
    // To initialize with 1 strategy
    bool isStrategyInitialized = false;
    // The last proposed strategy to switch to.
    StratCandidate public stratCandidate;
    // The strategy currently in use by the vault.
    IStrategy public strategy;
    // The minimum time it has to pass before a strat candidate can be approved.
    uint256 public immutable approvalDelay;

    event NewStratCandidate(address implementation);
    event UpgradeStrat(address implementation);

    /**
     * @dev Sets the value of {token} to the token that the vault will
     * hold as underlying value. It initializes the vault's own 'moo' token.
     * This token is minted when someone does a deposit. It is burned in order
     * to withdraw the corresponding portion of the underlying assets.
     * @param _name the name of the vault token.
     * @param _symbol the symbol of the vault token.
     * @param _approvalDelay the delay before a new strat can be approved.
     */
    constructor (
        //IStrategy _strategy,
        string memory _name,
        string memory _symbol,
        uint256 _approvalDelay
    ) ERC20(
        _name,
        _symbol
    ) {
        //strategy = _strategy;
        approvalDelay = _approvalDelay;
    }

    function setDefaultStrategy(address _strategy) public onlyOwner{
        require(address(this) == IStrategy(_strategy).vault(), "Proposal not valid for this Vault");
        require(isStrategyInitialized == false,"Only 1 time");
        strategy = IStrategy(_strategy);
        isStrategyInitialized = true;
    }

    function want() public view returns (IERC20) {
        return IERC20(strategy.want());
    }

    function reward() public view returns (IERC20) {
        return IERC20(strategy.reward());
    }

    /** 
     * @dev Balance of Rewards
     */
    function balance_reward() public view returns (uint) {
        return reward().balanceOf(address(this)).add(reward().balanceOf(address(strategy)));
    }


    /**
     * @dev Function to return the amount of Rewards based on the share
     */
    function getPricePerFullShare_reward() public view returns (uint256) {
        return totalSupply() == 0 ? 1e18 : balance_reward().mul(1e18).div(totalSupply());
    }

     /** 
     * @dev It calculates the total underlying value of {token} held by the system.
     * It takes into account the vault contract balance, the strategy contract balance
     *  and the balance deployed in other contracts as part of the strategy.
     */
    function balance_want() public view returns (uint) {
        return want().balanceOf(address(this)).add(IStrategy(strategy).balanceOf());
    }

    /**
     * @dev Custom logic in here for how much the vault allows to be borrowed.
     * We return 100% of tokens for now. Under certain conditions we might
     * want to keep some of the system funds at hand in the vault, instead
     * of putting them to work.
     */
    function available_want() public view returns (uint256) {
        return want().balanceOf(address(this));
    }

    /**
     * @dev Function for various UIs to display the current value of one of our yield tokens.
     * Returns an uint256 with 18 decimals of how much underlying asset one vault share represents.
     */
    function getPricePerFullShare_want() public view returns (uint256) {
        return totalSupply() == 0 ? 1e18 : balance_want().mul(1e18).div(totalSupply());
    }

    /**
     * @dev A helper function to call deposit() with all the sender's funds.
     */
    function depositAll() external {
        deposit(want().balanceOf(msg.sender));
    }

    /**
     * @dev The entrypoint of funds into the system. People deposit with this function
     * into the vault. The vault is then in charge of sending funds into the strategy.
     */
    function deposit(uint _amount) public nonReentrant {
        strategy.beforeDeposit();

        uint256 _pool = balance_want();
        want().safeTransferFrom(msg.sender, address(this), _amount);
        earn();
        uint256 _after = balance_want();
        _amount = _after.sub(_pool); // Additional check for deflationary tokens
        uint256 shares = 0;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div(_pool);
        }
        _mint(msg.sender, shares);
    }

    /**
     * @dev Function to send funds into the strategy and put them to work. It's primarily called
     * by the vault's deposit() function.
     */
    function earn() public {
        uint _bal = available_want();
        want().safeTransfer(address(strategy), _bal);
        strategy.deposit();
    }

    /**
     * @dev A helper function to call withdraw() with all the sender's funds.
     */
    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    /**
     * @dev Function to exit the system. The vault will withdraw the required tokens
     * from the strategy and pay up the token holder. A proportional number of ICE
     * tokens are burned in the process.
     */
    function withdraw(uint256 _shares) public {
        uint256 _want = (balance_want().mul(_shares)).div(totalSupply());
        uint256 _rewards = (balance_reward().mul(_shares)).div(totalSupply());
        _burn(msg.sender, _shares);

        uint bal = want().balanceOf(address(this));
        // To optimize the calls we only withdraw if there is not enough in the vault
        if (bal < _want) {
            uint _withdraw = _want.sub(bal);
            strategy.withdraw(_withdraw);
            uint _after = want().balanceOf(address(this));
            uint _diff = _after.sub(bal);
            if (_diff < _withdraw) {
                _want = bal.add(_diff);
            }
        }
        reward().safeTransfer(msg.sender, _rewards);
        want().safeTransfer(msg.sender, _want);
    }

    /** 
     * @dev Sets the candidate for the new strat to use with this vault.
     * @param _implementation The address of the candidate strategy.  
     */
    function proposeStrat(address _implementation) public onlyOwner {
        require(address(this) == IStrategy(_implementation).vault(), "Proposal not valid for this Vault");
        stratCandidate = StratCandidate({
            implementation: _implementation,
            proposedTime: block.timestamp
         });

        emit NewStratCandidate(_implementation);
    }

    /** 
     * @dev It switches the active strat for the strat candidate. After upgrading, the 
     * candidate implementation is set to the 0x00 address, and proposedTime to a time 
     * happening in +100 years for safety. 
     */

    function upgradeStrat() public onlyOwner {
        require(stratCandidate.implementation != address(0), "There is no candidate");
        require(stratCandidate.proposedTime.add(approvalDelay) < block.timestamp, "Delay has not passed");

        emit UpgradeStrat(stratCandidate.implementation);

        strategy.retireStrat();
        strategy = IStrategy(stratCandidate.implementation);
        stratCandidate.implementation = address(0);
        stratCandidate.proposedTime = 5000000000;

        earn();
    }

    /**
     * @dev Rescues random funds stuck that the strat can't handle.
     * @param _token address of the token to rescue.
     */
    function inCaseTokensGetStuck(address _token) external onlyOwner {
        require(_token != address(want()), "!token");

        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, amount);
    }
}
