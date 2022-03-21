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
  const _vault        = await PLFY_Vault.deployed();
  const _vaultMaxi    = await MAXI_Vault.deployed();

  // --> REDEPLOYING POOLIFY MANAGER
  await deployer.deploy(PoolifyRewardManager,...Object.values({
    tokenAddress:_poolifyToken.address,
    rewardPerBlock:tokens('0.5'),
    startingBlock:0,
    devAddress:admin
  }));
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();

  await _poolifyRewardManager.addPool(1000,LPToken_Address,false);

  // Grant Roles to PLFY Token (MINTER)
  await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);


  
  // --> REDEPLOYING   await deployer.deploy(StrategyPLFYLiquidity,...Object.values(_poolifyStrategyParams));

  await deployer.deploy(StrategyPLFYLiquidity,...Object.values({
    want: LPToken_Address,
    reward: _poolifyToken.address,
    rewardManager: _poolifyRewardManager.address,
    poolRewardId:1,
    vault: _vault.address,
    keeper: admin,
    strategistRecipient: admin
  }));

  await deployer.deploy(StrategyPLFY,...Object.values({
    want: _poolifyToken.address,
    rewardManager: _poolifyRewardManager.address, // 0xFC11C0C53BF631e979b3478B25DF2FaaCc61E04E
    vault: _vaultMaxi.address,
    keeper: admin,
    poolifyFeeRecipient: admin
  }));

  const _strategyPLFYLiquidity = await StrategyPLFYLiquidity.deployed();
  const _strategyPLFYMaxi = await StrategyPLFY.deployed();



  // Init default Strategy
  await _vault.proposeStrat(_strategyPLFYLiquidity.address); // 0xB4BC51a8D24a6C92EcEB4Fc678E52837069905FF
  await _vault.upgradeStrat();
  // Init default Strategy
  await _vaultMaxi.proposeStrat(_strategyPLFYMaxi.address); // 0x5a6ED27aA7e3FeEB7208A8C59203Fb0bf9639390
  await _vaultMaxi.upgradeStrat();


}
