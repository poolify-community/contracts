/** Methods  **/
const chai = require('chai');
const BigNumber = require('bignumber.js');
const { artifacts } = require("hardhat");
const { assert } = chai;

/** Contracts **/
const PLFY_Vault = artifacts.require('vaults/PLFY_Vault');
const PoolifyRewardManager = artifacts.require('vaults/PoolifyRewardManager');

const StrategyPLFYLiquidity = artifacts.require('strategies/Poolify/StrategyPLFYLiquidity');
const PLFYToken      = artifacts.require('tokens/PLFYToken');
const PANCAKE_PLFY_BNB      = artifacts.require('mock/MockERC20');

const ACC_PRECISION = '1e18';

//const TokenFarm = artifacts.require('TokenFarm')

chai.use(require('chai-as-promised')).should();

//use default BigNumber

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}

const POOLFY_REWARD_PER_BLOCK = tokens('10');
const POOLFY_CALL_FEE = 1000;
const POOLFY_STRATEGIST_FEE = 1000;

const formatter = (val) =>{
  return new BigNumber(val).dividedBy(ACC_PRECISION);
}

contract('PLFY-BNB : Liquidity Mining', ([dev,alice,bob]) => {
    let  _poolifyToken,_lpToken,_poolifyRewardManager, _vault, _strategy;

    async function generatingData(){

        // Load PLFY  
        _poolifyToken = await PLFYToken.new();
        _lpToken      = await PANCAKE_PLFY_BNB.new('PANCAKE_PLFY_BNB','lp-PLFY-BNB',tokens('10000000'));

        // Load Poolify Vault
        const vaultParams = {
          vaultName: `Bucket PLFY-BNB`,
          vaultSymbol: `bucketCakeV2PLFY-BNB`, // Liquidity will come from pancake swap
          delay: 21600,
        }
        
        _vault = await PLFY_Vault.new(...Object.values(vaultParams));

        // Load Reward
        const rewardParams = {
          plfy: _poolifyToken.address,
          rewardPerBlock: POOLFY_REWARD_PER_BLOCK,
          startBlock:0,
          devAddress:dev
        }
        _poolifyRewardManager = await PoolifyRewardManager.new(...Object.values(rewardParams));
        await _poolifyRewardManager.setPool(0, 0,false);
        await _poolifyRewardManager.addPool(1000,_lpToken.address,false);

        
        
        // Load Strategy
        const strategyParams = {
          want: _lpToken.address,
          reward: _poolifyToken.address,
          rewardManager: _poolifyRewardManager.address,
          poolRewardId:1,
          vault: _vault.address,
          keeper: dev,
          strategistRecipient: dev
        };
        _strategy = await StrategyPLFYLiquidity.new(...Object.values(strategyParams));
        await _strategy.setCallFee(POOLFY_CALL_FEE);
        await _strategy.setStrategistFee(POOLFY_STRATEGIST_FEE);
        
        // Init default Strategy
        await _vault.setDefaultStrategy(_strategy.address);
    
        // Grant Roles to PLFY Token (MINTER)
        await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);

        // Provide PLFY to Alice & Bob

        await _lpToken.mint(alice,tokens('100'));
        await _lpToken.mint(bob,tokens('100'));
    
    }
  

    context("> Test", async () => {

      before(async () => {
        await generatingData();
      })

      it('Deposit & Withdraw from VAULT', async () => {
        // 1. Check the balance
        assert.equal(formatter(await _lpToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _lpToken.balanceOf(bob)).toString(),'100');

        // 2. Deposit PLFY to the PLFY Vault
        await _lpToken.approve(_vault.address, tokens('100'),{ from: alice });
        await _vault.deposit(tokens('100'),{ from: alice });
        
        // Check Vault,Strategy & rewardPool balance
        assert.equal(formatter(await _vault.balance_want()).toString(), '100');
        assert.equal(formatter(await _strategy.balanceOf()).toString(), '100');

        // Check Bucket PLFY balance of alice
        assert.equal(formatter(await _vault.balanceOf(alice)).toString(),'100');
        
        // 3 Update the reward Pool (generate 1 block + 50 PLFY)    

        await _poolifyRewardManager.updatePool(1);

        // Check the pending reward for (Alice, Vault & Strategy)
        expect(formatter(await _poolifyRewardManager.pendingPoolify(1,alice)).toString()).to.be.eq('0');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(1,_vault.address)).toString()).to.be.eq('0');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(1,_strategy.address)).toString()).to.be.eq('10');
        
        // Check calling fee
        assert.equal((await _strategy.CALL_FEE()).toString(),POOLFY_CALL_FEE);
        // Check pending rewards
        assert.equal(formatter(await _strategy.balanceOfPendingRewards()).toString(),'10');
        
        await _strategy.harvest(dev);

        /** Check LP Token balance to see if there was no changes !!!  */
        assert.equal(formatter(await _strategy.balanceOf()).toString(),'100'); //  10 + 10 - 1 
        assert.equal(formatter(await _vault.balance_want()).toString(),'100');
        assert.equal(formatter(await _vault.balance_reward()).toString(),'19');
        assert.equal(formatter(await _vault.available_want()).toString(),'0');
         /** Check Poolify rewards  */
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'0');
        assert.equal(formatter(await _poolifyToken.balanceOf(_strategy.address)).toString(),'0');
        assert.equal(formatter(await _poolifyToken.balanceOf(_vault.address)).toString(),'19');

        // 5 Alice withdraw from the vault
        await _vault.withdrawAll({ from: alice });

        
        // Check Bucket & PLFY balance of alice
        assert.equal(formatter(await _vault.balanceOf(alice)).toString(),'0');
        // Alice is receiving PLFY and the LPTokens back
        assert.equal(formatter(await _lpToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'19');
      });




    })

  






})