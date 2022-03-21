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

contract('PLFY : Reward Manager', ([dev,alice,bob]) => {
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

      it('Direct deposit', async () => {
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
        await _poolifyRewardManager.leaveStaking(tokens('100'),{from:alice});
        
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'200');

        // 12. Deposit PLFY to the PLFY Reward Manager
        await _poolifyToken.approve(_poolifyRewardManager.address, tokens('200'),{ from: alice });
        await _poolifyRewardManager.enterStaking(tokens('200'),{ from: alice });

        // 13. Trigger random update pool to make 1 more block mine
        await _poolifyRewardManager.massUpdatePools();

      });

    })



})