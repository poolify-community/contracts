/** Methods  **/
const chai = require('chai');
const BigNumber = require('bignumber.js');
const { artifacts } = require("hardhat");
const { assert } = chai;

/** Contracts **/
const PLFY_Vault = artifacts.require('vaults/PLFY_Vault');
const MAXI_Vault = artifacts.require('vaults/MAXI_Vault');
const PoolifyRewardManager = artifacts.require('protocol/PoolifyRewardManager');
const PoolifyHarvestAll = artifacts.require('protocol/PoolifyHarvestAll');

const StrategyPLFYLiquidity = artifacts.require('strategies/Poolify/StrategyPLFYLiquidity');
const StrategyPLFY = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken      = artifacts.require('tokens/PLFYToken');
const PANCAKE_PLFY_BNB      = artifacts.require('mock/MockERC20');
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

contract('POOLIFY MAXI & Liquidity vault', ([dev,alice,bob]) => {
    let  _poolifyToken,_poolifyRewardManager, _vault,_vaultLiquidity, _strategy,_strategyLiquidity,_poolifyHarvestAll;

    async function generatingData(){

        // Load PLFY  
        _poolifyToken = await PLFYToken.new();
        _poolifyHarvestAll = await PoolifyHarvestAll.new();
        _lpToken      = await PANCAKE_PLFY_BNB.new('PANCAKE_PLFY_BNB','lp-PLFY-BNB',tokens('10000000'));

        // Load Reward
        const rewardParams = {
            plfy: _poolifyToken.address,
            rewardPerBlock: POOLFY_REWARD_PER_BLOCK,
            startBlock:0,
            devAddress:dev
          }
          _poolifyRewardManager = await PoolifyRewardManager.new(...Object.values(rewardParams));

          

        // Load Poolify Vault
        const vaultLiquidityParams = {
          vaultName: `Bucket PLFY-BNB`,
          vaultSymbol: `bucketCakeV2PLFY-BNB`, // Liquidity will come from pancake swap
          delay: 21600,
        }
        
        _vaultLiquidity = await PLFY_Vault.new(...Object.values(vaultLiquidityParams));

        // Load Poolify Vault
        const vaultParams = {
          vaultName: `Bucket PLFY`,
          vaultSymbol: `bPLFY`,
          delay: 21600,
        }
        
        _vault = await MAXI_Vault.new(...Object.values(vaultParams));

        
        
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

        // Load Strategy
        const strategyLiquidityParams = {
            want: _lpToken.address,
            reward: _poolifyToken.address,
            rewardManager: _poolifyRewardManager.address,
            poolRewardId:1,
            vault: _vaultLiquidity.address,
            keeper: dev,
            strategistRecipient: dev
          };
          _strategyLiquidity = await StrategyPLFYLiquidity.new(...Object.values(strategyLiquidityParams));
          await _strategyLiquidity.setCallFee(POOLFY_CALL_FEE);
          await _strategyLiquidity.setStrategistFee(POOLFY_STRATEGIST_FEE);
          
        

        // Init default Strategy
        await _vault.setDefaultStrategy(_strategy.address);
        await _vaultLiquidity.setDefaultStrategy(_strategyLiquidity.address);
    
        // Grant Roles to PLFY Token (MINTER)
        await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);

        // Add a 2nd pool
        await _poolifyRewardManager.addPool(1000,_lpToken.address,false);
        
        // Provide PLFY to Alice & Bob
        
        await _poolifyToken.mint(alice,tokens('100'));
        await _poolifyToken.mint(bob,tokens('100'));
          
        // Provide LP Token to Alice & Bob
        await _lpToken.mint(alice,tokens('100'));
        await _lpToken.mint(bob,tokens('100'));
    }
  

    
    context("> Test", async () => {

      before(async () => {
        await generatingData();
      })

      it('Deposit & Withdraw from VAULTs', async () => {
        // 1. Check the balance
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'100');

        // 2. Deposit PLFY to the PLFY Vault
        await _poolifyToken.approve(_vault.address, tokens('100'),{ from: alice });
        await _vault.deposit(tokens('100'),{ from: alice });

        await _lpToken.approve(_vaultLiquidity.address, tokens('100'),{ from: bob });
        await _vaultLiquidity.deposit(tokens('100'),{ from: bob });
        
        // 3 Update the reward Pool (generate 1 block + 50 PLFY)    
        await _poolifyRewardManager.updatePool(0);

        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,_strategy.address)).toString()).to.be.eq('75');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(1,_strategyLiquidity.address)).toString()).to.be.eq('25');

        // 4 harvest All
        //let addresses = [_strategy.address,_strategyLiquidity.address];
        let addresses = [_vault.address,_vaultLiquidity.address];
        await _poolifyHarvestAll.harvestAll(addresses);

        expect(formatter(await _poolifyRewardManager.pendingPoolify(0,_strategy.address)).toString()).to.be.eq('0');
        expect(formatter(await _poolifyRewardManager.pendingPoolify(1,_strategyLiquidity.address)).toString()).to.be.eq('0');

      });




    })

  






})