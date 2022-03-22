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

contract('POOLIFY Test Upgrade Vault', ([dev,alice,bob]) => {
    let  _poolifyToken,_poolifyRewardManager, _vault, _strategy,_strategy2;

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


        _strategy2 = await StrategyPLFY.new(...Object.values(strategyParams));
        await _strategy2.setCallFee(POOLFY_CALL_FEE);
        await _strategy2.setStrategistFee(POOLFY_STRATEGIST_FEE);
        
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

      it('Upgrade strategy', async () => {
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

        // 4 Upgrade Strate

        await _vault.proposeStrat(_strategy2.address);
        //await _vault.upgradeStrat();

      });




    })

  






})