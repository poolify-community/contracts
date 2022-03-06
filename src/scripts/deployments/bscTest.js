/** Contracts **/
const PoolifyVault    = artifacts.require('vaults/PoolifyVault');
const PoolifyRewardManager     = artifacts.require('protocol/PoolifyRewardManager');

const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken       = artifacts.require('tokens/PLFYToken');


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
    rewardPerBlock:tokens('1'),
    startingBlock:0,
    devAddress:admin
  }
  await deployer.deploy(PoolifyRewardManager,...Object.values(_poolifyRewardManagerParams));
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();

  return {_poolifyToken,_poolifyRewardManager}
}


module.exports = async function(deployer, network, accounts) {

  const dev   = accounts[0];
  const alice = accounts[1];
  const bob   = accounts[2];

  // Deploy PLFY Token
  await deployer.deploy(PLFYToken);
  const _poolifyToken = await PLFYToken.deployed();

  // Deploy Poolify Chef
  _poolifyChefParams = {
    tokenAddress:_poolifyToken.address,
    rewardPerBlock:tokens('1'),
    startingBlock:0,
    devAddress:dev
  }
  await deployer.deploy(PoolifyChef,...Object.values(_poolifyChefParams));
  const _poolifyChef = await PoolifyChef.deployed();


  // Load Vault
  const _poolifyVaultParams = {
    vaultName: `Bucket PLFY`,
    vaultSymbol: `bPLFY`,
    delay: 21600,
  }
  await deployer.deploy(PoolifyVault,...Object.values(_poolifyVaultParams));
  const _vault = await PoolifyVault.deployed();

  // Load Strategy
  const _poolifyStrategyParams = {
    want: _poolifyToken.address,
    masterChef: _poolifyChef.address,
    vault: _vault.address,
    keeper: dev,
    poolifyFeeRecipient: dev
  };
  await deployer.deploy(StrategyPLFY,...Object.values(_poolifyStrategyParams));
  const _strategy = await StrategyPLFY.deployed();
  

  // Init default Strategy
  await _vault.setDefaultStrategy(_strategy.address);

  // Grant Roles to PLFY Token (MINTER)
  await _poolifyToken.grantRole(await _poolifyToken.MINTER_ROLE.call(),_poolifyChef.address);

  // Provide PLFY to Alice & Bob
  

  await _poolifyToken.mint(alice,tokens('100'));
  await _poolifyToken.mint(bob, tokens('100'));

  // Transfer all tokens to TokenFarm (1 million)
  //await _poolifyToken.transfer(_tokenFarm.address, '1000000000000000000000000')

  // Transfer 100 Mock BUSD tokens to investor
  //await _busdToken.transfer(accounts[1], '100000000000000000000')

  
}
