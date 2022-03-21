/** Methods  **/
const chai = require('chai');
const BigNumber = require('bignumber.js');
const { artifacts } = require("hardhat");
const { assert } = chai;

/** Contracts **/
const MAXI_Vault = artifacts.require('vaults/MAXI_Vault');
const PoolifyRewardManager = artifacts.require('vaults/PoolifyRewardManager');

const StrategyPLFY = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken      = artifacts.require('tokens/PLFYToken');

const ACC_PRECISION = '1e18';

//const TokenFarm = artifacts.require('TokenFarm')

chai.use(require('chai-as-promised')).should();

//use default BigNumber

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}

const POOLFY_REWARD_PER_BLOCK = tokens('50');
const POOLFY_CALL_FEE = 1000;
const POOLFY_STRATEGIST_FEE = 1000;

const formatter = (val) =>{
  return new BigNumber(val).dividedBy(ACC_PRECISION);
}

contract('POOLIFY MAXI vault', ([dev,alice,bob]) => {
    let  _poolifyToken,_poolifyRewardManager, _vault, _strategy;

    async function generatingData(){

        // Load PLFY  
        _poolifyToken = await PLFYToken.new();

        // Load Poolify Vault
        const vaultParams = {
          vaultName: `Bucket PLFY`,
          vaultSymbol: `bPLFY`,
          delay: 21600,
        }
        
        _vault = await MAXI_Vault.new(...Object.values(vaultParams));

        // Load Reward
        const rewardParams = {
          plfy: _poolifyToken.address,
          rewardPerBlock: POOLFY_REWARD_PER_BLOCK,
          startBlock:0,
          devAddress:dev
        }
        _poolifyRewardManager = await PoolifyRewardManager.new(...Object.values(rewardParams));

        
        
        // Load Strategy
        const strategyParams = {
          want: _poolifyToken.address,
          rewardManager: _poolifyRewardManager.address,
          vault: _vault.address,
          keeper: dev,
          strategistRecipient: dev
        };
        _strategy = await StrategyPLFY.new(...Object.values(strategyParams));
        await _strategy.setCallFee(POOLFY_CALL_FEE);
        await _strategy.setStrategistFee(POOLFY_STRATEGIST_FEE);
        
        //console.log("---- Deployment ----");
        //console.log("Vault deployed to:", _vault.address);
        //console.log("Strategy deployed to:", _strategy.address);
        //console.log("Reward Pool deployed to:", _poolifyRewardManager.address);

        // Init default Strategy
        await _vault.setDefaultStrategy(_strategy.address);
    
        // Grant Roles to PLFY Token (MINTER)
        await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);

        // Provide PLFY to Alice & Bob

        await _poolifyToken.mint(alice,tokens('100'));
        await _poolifyToken.mint(bob,tokens('100'));
    
    }
  

    
    context("> Test", async () => {

      before(async () => {
        await generatingData();
      })

      it('Deposit & Withdraw from VAULT', async () => {
        // 1. Check the balance
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'100');

        // 2. Deposit PLFY to the PLFY Vault
        await _poolifyToken.approve(_vault.address, tokens('100'),{ from: alice });
        await _vault.deposit(tokens('100'),{ from: alice });
        
        // Check Vault,Strategy & rewardPool balance
        assert.equal(formatter(await _vault.balance()).toString(), '100');
        assert.equal(formatter(await _strategy.balanceOf()).toString(), '100');

        // Check Bucket PLFY balance of alice
        assert.equal(formatter(await _vault.balanceOf(alice)).toString(),'100');
        
        // 3 Update the reward Pool (generate 1 block + 50 PLFY)    

        await _poolifyRewardManager.updatePool(0);

        // Check the pending reward for (Alice, Vault & Strategy)
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,alice)).toString()).to.be.eq('0');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,_vault.address)).toString()).to.be.eq('0');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,_strategy.address)).toString()).to.be.eq('50');
        
        // Check calling fee
        assert.equal((await _strategy.CALL_FEE()).toString(),POOLFY_CALL_FEE);
        // Check pending rewards
        assert.equal(formatter(await _strategy.balanceOfPendingRewards()).toString(),'50');
        let _pendingRewards = await _strategy.balanceOfPendingRewards();
        let _expectedBounty = new BigNumber(POOLFY_CALL_FEE).dividedBy('10000').times(_pendingRewards).dividedBy(ACC_PRECISION); // 10%
        
        // Check the bounty
        assert.equal(formatter(await _strategy.balanceOfBounty()).toString(),_expectedBounty.toString());
        assert.equal(formatter(await _strategy.balanceOfBounty()).toString(),'5');
        // 4 strategy harvest (generate 1 block + 50 PLFY)
        await _strategy.harvest(dev);
        
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,_strategy.address)).toString()).to.be.eq('0');
        assert.equal(formatter(await _strategy.balanceOf()).toString(),'180'); // 100 + 50 + 50 - 10 - 10
        assert.equal(formatter(await _vault.balance()).toString(),'180');
        assert.equal(formatter(await _vault.available()).toString(),'0');

        // 5 Alice withdraw from the vault
        await _vault.withdrawAll({ from: alice });

        
        // Check Bucket & PLFY balance of alice
        assert.equal(formatter(await _vault.balanceOf(alice)).toString(),'0');
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'180');
      });




    })

  






})