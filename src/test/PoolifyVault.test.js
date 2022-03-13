/** Methods  **/
const { ethers } = require("ethers");
const {constants} = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

/** Contracts **/
const PoolifyVault = artifacts.require('vaults/PoolifyVault');
const PoolifyChef = artifacts.require('vaults/PoolifyChef');

const StrategyPLFY = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken      = artifacts.require('tokens/PLFYToken');
//const TokenFarm = artifacts.require('TokenFarm')

require('chai').use(require('chai-as-promised')).should()

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

contract('StrategySimpleStaking', ([dev,alice,bob]) => {
    let  _poolifyToken, _poolifyChef, _vault, _strategy;

    async function generatingData(){

        // Load PLFY  
        _poolifyToken = await PLFYToken.new();

        // Load Chef
        _poolifyChef = await PoolifyChef.new(
          _poolifyToken.address,
          POOLFY_REWARD_PER_BLOCK,
          0,
          dev
        );

        // Load Vault
        const vaultParams = {
          vaultName: `Bucket PLFY`,
          vaultSymbol: `bPLFY`,
          delay: 21600,
        }
        
        _vault = await PoolifyVault.new(...Object.values(vaultParams));
        
        // Load Strategy
        const strategyParams = {
          want: _poolifyToken.address,
          masterChef: _poolifyChef.address,
          vault: _vault.address,
          keeper: dev,
          poolifyFeeRecipient: dev
        };
        _strategy = await StrategyPLFY.new(...Object.values(strategyParams));
        
        //console.log("---- Deployment ----");
        //console.log("Vault deployed to:", _vault.address);
        //console.log("Strategy deployed to:", _strategy.address);
        //console.log("Reward Pool deployed to:", _poolifyChef.address);

        // Init default Strategy
        await _vault.setDefaultStrategy(_strategy.address);
    
        // Grant Roles to PLFY Token (MINTER)
        await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyChef.address);

        // Provide PLFY to Alice & Bob

        await _poolifyToken.mint(alice,tokens('100'));
        await _poolifyToken.mint(bob, tokens('100'));
    
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
        assert.equal((await _poolifyToken.balanceOf(alice)).toString(), tokens('100'));
        assert.equal((await _poolifyToken.balanceOf(bob)).toString(), tokens('100'));

        // 2. Deposit PLFY to the PLFY Reward Manager
        await _poolifyToken.approve(_poolifyChef.address, tokens('100'),{ from: alice });
        await _poolifyChef.deposit(0,tokens('100'),{ from: alice });

        // 3. Trigger random update pool to make 1 more block mine
        await _poolifyChef.massUpdatePools();


        // 4. Check pendingPoolify for Alice
        expect((await _poolifyChef.pendingPoolify(0,alice)).toString()).to.be.eq(tokens('50'));

        // 5. Trigger random update pool to make 1 more block mine
        await _poolifyChef.massUpdatePools();

        // 6. Check pendingPoolify for Alice
        expect((await _poolifyChef.pendingPoolify(0,alice)).toString()).to.be.eq(tokens('100'));

        // 7. Alice should get 50*3 PLFYs when she harvest
        await _poolifyChef.withdraw(0, tokens('100'),{from:alice});

        assert.equal((await _poolifyToken.balanceOf(alice)).toString(), tokens('250'));

      });

    })

    context("POOLIFY vault", async () => {

      before(async () => {
        await generatingData();
      })

      it('Deposit & Withdraw', async () => {
        // 1. Check the balance
        assert.equal((await _poolifyToken.balanceOf(alice)).toString(), tokens('100'));
        assert.equal((await _poolifyToken.balanceOf(bob)).toString(), tokens('100'));

        // 2. Deposit PLFY to the PLFY Vault
        await _poolifyToken.approve(_vault.address, tokens('100'),{ from: alice });
        await _vault.deposit(tokens('100'),{ from: alice });
        
        // Check Vault,Strategy & rewardPool balance
        assert.equal((await _vault.balance()).toString(), tokens('100'));
        assert.equal((await _strategy.balanceOf()).toString(), tokens('100'));

        // Check Bucket PLFY balance of alice
        assert.equal((await _vault.balanceOf(alice)).toString(), tokens('100'));
        
        // 3 Update the reward Pool (generate 1 block + 50 PLFY)    

        await _poolifyChef.updatePool(0);

        // Check the pending reward for (Alice, Vault & Strategy)
        expect((await _poolifyChef.pendingPoolify(0,alice)).toString()).to.be.eq(tokens('0'));
        expect((await _poolifyChef.pendingPoolify(0,_vault.address)).toString()).to.be.eq(tokens('0'));
        expect((await _poolifyChef.pendingPoolify(0,_strategy.address)).toString()).to.be.eq(tokens('50'));
        
        // 4 strategy harvest (generate 1 block + 50 PLFY)
        await _strategy.harvest();

        expect((await _poolifyChef.pendingPoolify(0,_strategy.address)).toString()).to.be.eq(tokens('0'));
        assert.equal((await _strategy.balanceOf()).toString(), tokens('200')); // 100 + 50 + 50
        assert.equal((await _vault.balance()).toString(),tokens('200'));
        assert.equal((await _vault.available()).toString(),tokens('0'));

        // 4 Alice withdraw from the vault
        await _vault.withdrawAll({ from: alice });

        
        // Check Bucket & PLFY balance of alice
        assert.equal((await _vault.balanceOf(alice)).toString(), tokens('0'));
        assert.equal((await _poolifyToken.balanceOf(alice)).toString(), tokens('200'));

        /** Issue creating */
        assert.equal((await _strategy.balanceOf()).toString(), tokens('0')); 
        assert.equal((await _vault.balance()).toString(),tokens('0'));
        assert.equal((await _vault.available()).toString(),tokens('0'));

      });




    })

  






})