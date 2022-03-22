/** Libraries */
const web3 = require('web3');
/** Contracts **/
const MAXI_Vault    = artifacts.require('vaults/MAXI_Vault');
const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');
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

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;
  let networkId = deployer.networks[network].network_id;

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
  
  const poolifyMaxi = await deployPoolifyMaxi(deployer,{_poolifyToken,_poolifyRewardManager,admin});

  const poolifyLiquidity = await deployPoolifyLiquidity(deployer,{_poolifyToken,_poolifyRewardManager,admin});


  // Provide PLFY to Admin account for testing
  
  await _poolifyToken.mint(admin,tokens('10000'));
}

/**
 *  DEPLOY Poolify Maxi Vault
**/

const deployPoolifyMaxi = async function(deployer,{_poolifyToken,_poolifyRewardManager,admin}){
   // Deploy Vault
    const _poolifyVaultParams = {
      vaultName: `Bucket PLFY`,
      vaultSymbol: `bucketPLFYMaxi`,
      delay: 21600,
    }
    await deployer.deploy(MAXI_Vault,...Object.values(_poolifyVaultParams));
    const _vault = await MAXI_Vault.deployed();

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

const deployPoolifyLiquidity = async function(deployer,{_poolifyToken,_poolifyRewardManager,admin}){
  // Deploy Vault
  const _poolifyVaultParams = {
    vaultName: `Bucket PLFY-BNB`,
    vaultSymbol: `bucketPLFY-BNB`,
    delay: 21600,
  }
   await deployer.deploy(PLFY_Vault,...Object.values(_poolifyVaultParams));
   const _vault = await PLFY_Vault.deployed();

   // Load Strategy
   const _poolifyStrategyParams = {
     want: _poolifyToken.address,
     masterChef: _poolifyRewardManager.address,
     vault: _vault.address,
     keeper: admin,
     poolifyFeeRecipient: admin
   };
   await deployer.deploy(StrategyPLFYLiquidity,...Object.values(_poolifyStrategyParams));
   const _strategy = await StrategyPLFYLiquidity.deployed();
   

   // Init default Strategy
   await _vault.setDefaultStrategy(_strategy.address);

   return {_vault,_strategy};

}
