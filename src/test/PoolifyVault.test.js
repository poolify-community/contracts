/** Methods  **/
const { ethers } = require("ethers");
const {constants} = require('@openzeppelin/test-helpers');
const chai = require('chai');
const BigNumber = require('bignumber.js');
const { artifacts } = require("hardhat");
const { assert } = chai;

/** Contracts **/
const PoolifyVault = artifacts.require('vaults/PoolifyVault');
const PoolifyRewardManager = artifacts.require('vaults/PoolifyRewardManager');

const StrategyPLFY = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken      = artifacts.require('tokens/PLFYToken');
const IcePLFY       = artifacts.require('tokens/IcePLFY');

const ACC_PRECISION = '1e18';

//const TokenFarm = artifacts.require('TokenFarm')

chai.use(require('chai-as-promised')).should();

//use default BigNumber

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}
const resolveSwapRoute = (input, proxies, preferredProxy, output) => {
  if (input === output) return [input];
  if (proxies.includes(output)) return [input, output];
  if (proxies.includes(preferredProxy)) return [input, preferredProxy, output];
  return [input, proxies.filter(input)[0], output]; // TODO: Choose the best proxy
}

const POOLFY_REWARD_PER_BLOCK = tokens('50');
const POOLFY_CALL_FEE = 1000;

const formatter = (val) =>{
  return new BigNumber(val).dividedBy(ACC_PRECISION);
}

contract('StrategySimpleStaking', ([dev,alice,bob]) => {
    let  _poolifyToken,_icePLFY,_poolifyRewardManager, _vault, _strategy;

    async function generatingData(){

        // Load PLFY  
        _poolifyToken = await PLFYToken.new();

        // Load Ice
        const iceParams = {
          plfyToken: _poolifyToken.address
        }
        _icePLFY = await IcePLFY.new(...Object.values(iceParams));

        // Load Poolify Vault
        const vaultParams = {
          vaultName: `Bucket PLFY`,
          vaultSymbol: `bPLFY`,
          delay: 21600,
        }
        
        _vault = await PoolifyVault.new(...Object.values(vaultParams));

        // Load Reward
        const rewardParams = {
          plfy: _poolifyToken.address,
          ice:_icePLFY.address,
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
          poolifyFeeRecipient: dev
        };
        _strategy = await StrategyPLFY.new(...Object.values(strategyParams));
        await _strategy.setCallFee(POOLFY_CALL_FEE);
        
        //console.log("---- Deployment ----");
        //console.log("Vault deployed to:", _vault.address);
        //console.log("Strategy deployed to:", _strategy.address);
        //console.log("Reward Pool deployed to:", _poolifyRewardManager.address);

        // Init default Strategy
        await _vault.setDefaultStrategy(_strategy.address);
    
        // Grant Roles to PLFY Token (MINTER)
        await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);
        await _icePLFY.grantRole(await _icePLFY.MINTER_ROLE.call(),_poolifyRewardManager.address);

        // Provide PLFY to Alice & Bob

        await _poolifyToken.mint(alice,tokens('100'));
        await _poolifyToken.mint(bob,tokens('100'));
    
    }
  
    context('PLFY Token deployment', async () => {

      before(async () => {
        await generatingData();
      })

      it('has a name', async () => {
        assert.equal(await _poolifyToken.name(), 'PLFYToken');
        assert.equal(await _vault.name(), 'Bucket PLFY');
      });

    })

    context("POOLIFY Chef", async () => {

      before(async () => {
        await generatingData();
      })

      it('Direct deposit in poolifyChef', async () => {
        // 1. Check the balance
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'100');

        // 2. Deposit PLFY to the PLFY Reward Manager
        await _poolifyToken.approve(_poolifyRewardManager.address, tokens('100'),{ from: alice });
        await _poolifyRewardManager.enterStaking(tokens('100'),{ from: alice });

        // 3. Trigger random update pool to make 1 more block mine
        await _poolifyRewardManager.massUpdatePools();


        // 4. Check pendingPoolify for Alice
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,alice)).toString()).to.be.eq('50');

        // 5. Trigger random update pool to make 1 more block mine
        await _poolifyRewardManager.massUpdatePools();

        // 6. Check pendingPoolify for Alice
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,alice)).toString()).to.be.eq('100');

        // 7. Alice should get 50*3 PLFYs when she widthdraw
        await _poolifyRewardManager.leaveStaking(tokens('100'),{from:alice});

        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'250');

        // 8. Deposit PLFY to the PLFY Reward Manager
        await _poolifyToken.approve(_poolifyRewardManager.address, tokens('250'),{ from: alice });
        await _poolifyRewardManager.enterStaking(tokens('250'),{ from: alice });
        
        // 9. Trigger random update pool to make 1 more block mine
        await _poolifyRewardManager.massUpdatePools();

        // 10. Check pendingPoolify for Alice
        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,alice)).toString()).to.be.eq('50');

        // 11. Alice should have 350 PLFYs when she widthdraw
        await _poolifyRewardManager.leaveStaking(tokens('250'),{from:alice});
        
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'350');

      });

    })

    context("POOLIFY vault", async () => {

      before(async () => {
        await generatingData();
      })

      it('Deposit & Withdraw', async () => {
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
        assert.equal(formatter(await _strategy.balanceOf()).toString(),'195'); // 100 + 50 + 50 - 5
        assert.equal(formatter(await _vault.balance()).toString(),'195');
        assert.equal(formatter(await _vault.available()).toString(),'0');

        // 5 Alice withdraw from the vault
        await _vault.withdrawAll({ from: alice });

        
        // Check Bucket & PLFY balance of alice
        assert.equal(formatter(await _vault.balanceOf(alice)).toString(),'0');
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'195');

      });




    })

  






})