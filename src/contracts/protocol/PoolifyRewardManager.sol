// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/PLFYToken.sol";

/*
    Similar to pancake swap contract : masterChef.
    The main role of this contract is to mint and distributes the PLFY from the staking wallet
*/

contract PoolifyRewardManager is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many Staking tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint; // How many allocation points assigned to this pool. PLFY to distribute per block.
        uint256 lastRewardBlock; // Last block number that PLFY distribution occurs.
        uint256 accPoolifyPerShare; // Accumulated PLFY per share, times 1e18. See below.
        uint256 lpSupply; // We do this so we can directly calculate the pending rewards
    }

    /// @notice The Poolify ERC-20 contract.
    PLFYToken public immutable PLFY;

    // Dev address.
    address public devaddr;

    // PLFY tokens created per block.
    uint256 public poolifyPerBlock;

    // Bonus muliplier for early plfy makers.
    uint256 public BONUS_MULTIPLIER = 1;

    /// @notice Info of each pool.
    PoolInfo[] public poolInfo;

    /// @notice Address of the ERC-20 for each Pool.
    IERC20[] public stakeTokens;
    
    // The block number when PLFY mining starts.
    uint256 public startBlock;


    

    /// @notice Info of each user that stakes tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    uint256 private constant ACC_PLFY_PRECISION = 1e12;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken);
    event LogUpdatePool(uint256 indexed pid, uint256 lastRewardBlock, uint256 lpSupply, uint256 accPoolifyPerShare);
    event LogInit();



    /// @param _plfy the POOLIFY Token
    /// @param _poolifyPerBlock number of PLFY per block
    constructor(PLFYToken _plfy,uint256 _poolifyPerBlock,uint256 _startBlock,address _devaddr) {
        PLFY = _plfy;
        poolifyPerBlock = _poolifyPerBlock;
        startBlock = _startBlock;
        devaddr = _devaddr;

        // Initial Staking pool
        poolInfo.push(PoolInfo({
            lpToken: _plfy,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accPoolifyPerShare: 0,
            lpSupply : 0
        }));
        stakeTokens.push(_plfy);

        totalAllocPoint = 1000;
    }





    /// @notice Returns the number of pools.
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /// @notice Returns if stakeToken is duplicated
    function isDuplicatedPool(IERC20 _stakeToken) public view returns (bool) {
        uint256 length = stakeTokens.length;
        for(uint256 _pid = 0; _pid < length; _pid++) {
            if(stakeTokens[_pid] == _stakeToken) return true;
        }
        return false;
    }


    /// @notice set the number of PLFY per block
    function setPoolifyPerBlock(uint256 _poolifyPerBlock) external onlyOwner {
        poolifyPerBlock = _poolifyPerBlock;
    }

    function addPool(uint256 _allocPoint, IERC20 _stakeToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;

        totalAllocPoint = totalAllocPoint.add(_allocPoint);

        poolInfo.push(PoolInfo({
            lpToken: _stakeToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accPoolifyPerShare: 0,
            lpSupply : 0
        }));
        stakeTokens.push(_stakeToken);

        //recalculateAllocation();
    }


    // Update the given pool's PLFY allocation point. Can only be called by the owner.
    function setPool(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            //recalculateAllocation();
        }
    }

    /*
     function recalculateAllocation() internal {
        uint256 length = poolInfo.length;
        uint256 points = 0;
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points.add(poolInfo[pid].allocPoint);
        }
        if (points != 0) {
            points = points.div(3);
            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
            poolInfo[0].allocPoint = points;
        }
    }
    */

    /// @notice View function to see pending PLFY on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user address of user
    function pendingPoolify(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 accPoolifyPerShare = pool.accPoolifyPerShare;
        uint256 lpSupply           = pool.lpSupply;//pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 poolifyReward = multiplier.mul(poolifyPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accPoolifyPerShare = accPoolifyPerShare.add(
                poolifyReward.mul(ACC_PLFY_PRECISION).div(lpSupply)
            );
        }
        return user.amount.mul(accPoolifyPerShare).div(ACC_PLFY_PRECISION).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 lpSupply = pool.lpSupply;//pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 poolifyReward = multiplier
                    .mul(poolifyPerBlock)
                    .mul(pool.allocPoint)
                    .div(totalAllocPoint);

        PLFY.mint(devaddr, poolifyReward.div(10)); // 10% of the rewards to the DEV wallet
        PLFY.mint(address(this), poolifyReward);  
        
        pool.accPoolifyPerShare = pool.accPoolifyPerShare.add(poolifyReward.mul(ACC_PLFY_PRECISION).div(lpSupply));
        pool.lastRewardBlock = block.number;
        emit LogUpdatePool(_pid, pool.lastRewardBlock, 0, pool.accPoolifyPerShare);
    }


    /// @notice Deposit LP tokens to Poolify Reward manager for PLFY allocation.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _amount to deposit.
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        require (_pid != 0, 'deposit PLFY by staking');
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        updatePool(_pid);
        if (user.amount > 0) {
            
            uint256 pending = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION).sub(user.rewardDebt);
            if(pending > 0) {
                safePoolifyTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            pool.lpSupply   = pool.lpSupply.add(_amount);
            user.amount     = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION);
        emit Deposit(msg.sender, _pid, _amount);
    }

    /// @notice Withdraw LP tokens from MasterChef.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _amount of lp tokens to withdraw.
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        require (_pid != 0, 'withdraw PLFY by unstaking');
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION).sub(user.rewardDebt);
        if(pending > 0) {
            safePoolifyTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpSupply = pool.lpSupply.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Stake PLFY tokens to Reward Manager
    function enterStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        updatePool(0);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION).sub(user.rewardDebt);
            if(pending > 0) {
                safePoolifyTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount); // Transfert PLFY to the contract
            pool.lpSupply   = pool.lpSupply.add(_amount);
            user.amount     = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION);
        emit Deposit(msg.sender, 0, _amount);
    }

    // Withdraw PLFY tokens from STAKING.
    function leaveStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(0);
        uint256 pending = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION).sub(user.rewardDebt);
        if(pending > 0) {
            safePoolifyTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount     = user.amount.sub(_amount);
            pool.lpSupply   = pool.lpSupply.sub(_amount);

            pool.lpToken.safeTransfer(address(msg.sender), _amount); // Withdraw PLFY from the contract
        }
        user.rewardDebt = user.amount.mul(pool.accPoolifyPerShare).div(ACC_PLFY_PRECISION);

        emit Withdraw(msg.sender, 0, _amount);
    }


    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param _pid The index of the pool. See `poolInfo`.
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
        
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
    }

    /// @notice Safe Poolify transfer function, just in case if rounding error causes pool to not have enough PLFYs.
    function safePoolifyTransfer(address _to, uint256 _amount) internal {
        IERC20(PLFY).safeTransfer(_to, _amount);
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }


}