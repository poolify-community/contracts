/** Contracts **/
const PoolifyVault    = artifacts.require('vaults/PoolifyVault');
const PoolifyRewardManager     = artifacts.require('protocol/PoolifyRewardManager');

const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken       = artifacts.require('tokens/PLFYToken');

const instances = {};

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


const deploy_core = async function(deployer,accounts){
  const [admin,_] = accounts;
  // Deploy PLFY Token
  await deployer.deploy(PLFYToken);
  const _poolifyToken = await PLFYToken.deployed();

  // Deploy Poolify Chef
  _poolifyRewardManagerParams = {
    tokenAddress:_poolifyToken.address,
    rewardPerBlock:tokens('10'),
    startingBlock:0,
    devAddress:admin
  }
  await deployer.deploy(PoolifyRewardManager,...Object.values(_poolifyRewardManagerParams));
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();

  // Grant Roles to PLFY Token (MINTER)
  await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyRewardManager.address);

  instances = {
    ...instances,
    _poolifyToken,
    _poolifyRewardManager
  }
  return {_poolifyToken,_poolifyRewardManager}
}

const deploy_initialLiquidity = async function(deployer,accounts){

  // Deploy Vault
  const _poolifyVaultParams = {
    vaultName: `Bucket PLFY`,
    vaultSymbol: `bPLFY`,
    delay: 21600,
  }
  await deployer.deploy(PoolifyVault,...Object.values(_poolifyVaultParams));
  const _vault = await PoolifyVault.deployed();

  // Deploy Strategy
  const _poolifyStrategyParams = {
    want: instances._poolifyToken.address,
    rewardManager: instances._poolifyRewardManager.address,
    vault: _vault.address,
    keeper: dev,
    poolifyFeeRecipient: dev
  };
  await deployer.deploy(StrategyPLFY,...Object.values(_poolifyStrategyParams));
  const _strategy = await StrategyPLFY.deployed();


  // Set default Strategy for the Vault : BNB-PLFY
  await _vault.setDefaultStrategy(_strategy.address);

  instances = {
    ...instances,
    _vault,
    _strategy,
  }
  return {_vault,_strategy};
}


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;

  // Deploy Core
  const {_poolifyToken,_poolifyRewardManager} = deploy_core(deployer,accounts);
  
  // Deploy Initial Liquidity Mining Program (BNB-PLFY)
  
  //const {_vault,_strategy} = deploy_initialLiquidity(deployer,accounts);

  console.log('-----> instances: ',Object.keys(instances));


  // Provide PLFY to Admin account for testing
  
  await _poolifyToken.mint(admin,tokens('10000'));

  
}
