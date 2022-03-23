/** Libraries */
const web3 = require('web3');
const BigNumber = require('bignumber.js');

/** Contracts **/
const MAXI_Vault    = artifacts.require('vaults/MAXI_Vault');
const PLFY_Vault    = artifacts.require('vaults/PLFY_Vault');
const StrategyPLFYLiquidity    = artifacts.require('strategies/Poolify/StrategyPLFYLiquidity');
const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');


// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");
const PoolifyRewardManager     = artifacts.require("protocol/PoolifyRewardManager.sol");

const tokens = function(n) {
  return web3.utils.toWei(n, 'ether');
}

const LPToken_Address = '0x976a7753c88EBFD2d3154B8764a0176769e5a372'; // BSC_TESTNET

module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;

  // Deploy All multicalls

  const _poolifyToken = await PLFYToken.deployed();
  const _PLFY_Vault        = await PLFY_Vault.deployed();
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();


  
  // --> REDEPLOYING   await deployer.deploy(StrategyPLFYLiquidity,...Object.values(_poolifyStrategyParams));

  await deployer.deploy(StrategyPLFYLiquidity,...Object.values({
    want: LPToken_Address,
    reward: _poolifyToken.address,
    rewardManager: _poolifyRewardManager.address,
    poolRewardId:1,
    vault: _PLFY_Vault.address,
    keeper: admin,
    strategistRecipient: admin
  }));

  const _strategyPLFYLiquidity = await StrategyPLFYLiquidity.deployed();


  // Init default Strategy
  await _PLFY_Vault.proposeStrat(_strategyPLFYLiquidity.address); 


}
