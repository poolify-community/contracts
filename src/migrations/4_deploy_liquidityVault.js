/** Libraries */
const web3 = require('web3');
const BigNumber = require('bignumber.js');

/** Contracts **/
const PLFY_Vault    = artifacts.require('vaults/PLFY_Vault');
const StrategyPLFYLiquidity    = artifacts.require('strategies/Poolify/StrategyPLFYLiquidity');

// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");
const Multicall         = artifacts.require("protocol/Multicall.sol");
const CommunityFund     = artifacts.require("protocol/CommunityFund.sol");
const PoolifyPriceMulticall    = artifacts.require("protocol/PoolifyPriceMulticall.sol");
const PoolifyRewardManager     = artifacts.require("protocol/PoolifyRewardManager.sol");
const PoolifyStrategyMulticall = artifacts.require("protocol/PoolifyStrategyMulticall.sol");
const PoolifyLastHarvestMulticall     = artifacts.require("protocol/PoolifyLastHarvestMulticall.sol");

const tokens = function(n) {
  return web3.utils.toWei(n, 'ether');
}

const LPToken_Address = '0x976a7753c88EBFD2d3154B8764a0176769e5a372'; // BSC_TESTNET

module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;

  // Deploy All multicalls

  const _poolifyToken = await PLFYToken.deployed();
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();


  const _poolifyVaultParams = {
    vaultName: `Bucket PLFY-BNB-2`,
    vaultSymbol: `bucketCakeV2PLFY-BNB-2`,
    delay: 21600,
  }
  await deployer.deploy(PLFY_Vault,...Object.values(_poolifyVaultParams));
  const _vault = await PLFY_Vault.deployed();

  // Load Strategy
  const _poolifyStrategyParams = {
    want: LPToken_Address,
    reward: _poolifyToken.address,
    rewardManager: _poolifyRewardManager.address,
    poolRewardId:1,
    vault: _vault.address,
    keeper: admin,
    strategistRecipient: admin
  };
  await deployer.deploy(StrategyPLFYLiquidity,...Object.values(_poolifyStrategyParams));
  const _strategy = await StrategyPLFYLiquidity.deployed();
  

  // Init default Strategy
  await _vault.setDefaultStrategy(_strategy.address);
}
