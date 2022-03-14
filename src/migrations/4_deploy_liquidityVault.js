/** Libraries */
const web3 = require('web3');
/** Contracts **/
const PoolifyVault    = artifacts.require('vaults/PoolifyVault');
const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');

// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");
const Multicall         = artifacts.require("protocol/Multicall.sol");
const CommunityFund     = artifacts.require("protocol/CommunityFund.sol");
const PoolifyPriceMulticall    = artifacts.require("protocol/PoolifyPriceMulticall.sol");
const PoolifyRewardManager     = artifacts.require("protocol/PoolifyRewardManager.sol");
const PoolifyStrategyMulticall = artifacts.require("protocol/PoolifyStrategyMulticall.sol");
const PoolifyLastHarvestMulticall     = artifacts.require("protocol/PoolifyLastHarvestMulticall.sol");

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;

  // Deploy All multicalls
  await deployer.deploy(Multicall);
  const _Multicall = await Multicall.deployed();

  await deployer.deploy(PoolifyLastHarvestMulticall);

  await deployer.deploy(PoolifyPriceMulticall);

  await deployer.deploy(PoolifyStrategyMulticall);

  // Deploy PLFY Token
  await deployer.deploy(PLFYToken);
  const _poolifyToken = await PLFYToken.deployed();

  console.log('_poolifyToken.address',_poolifyToken.address);

  // Deploy Community Fund
  await deployer.deploy(CommunityFund);

  // Deploy Poolify Reward Manager
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

  
  // Deploy Initial Liquidity Mining Program (BNB-PLFY)
  
  const {_vault,_strategy} = await deployPoolifyMaxi(deployer,{_poolifyToken,_poolifyRewardManager,admin});


  // Provide PLFY to Admin account for testing
  
  await _poolifyToken.mint(admin,tokens('10000'));
}

/**
 *  DEPLOY Poolify PLFY - BNB Vault
 **/

const deployPoolifyBnbVault = async function(deployer,{_poolifyToken,_poolifyRewardManager,admin}){
   // Deploy Vault
    const _poolifyVaultParams = {
      vaultName: `Bucket PLFY-BNB`,
      vaultSymbol: `bucketCakeV2PLFY-BNB`,
      delay: 21600,
    }
    await deployer.deploy(PoolifyVault,...Object.values(_poolifyVaultParams));
    const _vault = await PoolifyVault.deployed();

    // Load Strategy
    const _poolifyStrategyParams = {
      want: _poolifyToken.address,
      masterChef: _poolifyRewardManager.address,
      vault: _vault.address,
      keeper: admin,
      poolifyFeeRecipient: admin
    };
    await deployer.deploy(StrategyPLFY,...Object.values(_poolifyStrategyParams));
    const _strategy = await StrategyPLFY.deployed();
    

    // Init default Strategy
    await _vault.setDefaultStrategy(_strategy.address);

    return {_vault,_strategy};

}
