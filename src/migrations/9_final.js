
const writeFile     = require('../scripts/utils/writeFile');

// vaults
const PoolifyVault  = artifacts.require("vaults/PoolifyVault.sol");


// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");
const Multicall         = artifacts.require("protocol/Multicall.sol");
const CommunityFund     = artifacts.require("protocol/CommunityFund.sol");
const PoolifyLastHarvestMulticall     = artifacts.require("protocol/PoolifyLastHarvestMulticall.sol");
const PoolifyPriceMulticall    = artifacts.require("protocol/PoolifyPriceMulticall.sol");
const PoolifyRewardManager     = artifacts.require("protocol/PoolifyRewardManager.sol");
const PoolifyStrategyMulticall = artifacts.require("protocol/PoolifyStrategyMulticall.sol");





const poolifyMaxi_config = require('../scripts/deployments/vaults/poolifyMaxi');



module.exports = async function(deployer,network,accounts) {
  const _poolifyToken = await PLFYToken.deployed();

  
  const config = [
    // POOLIFY MAXI
    poolifyMaxi_config({
      tokenAddress:PLFYToken.address,
      vaultContractAddress:PoolifyVault.address,
      network:network
    })

  ];

  /* Write Pools */
  writeFile(`build/config/${network}.json`,JSON.stringify(config,null, 4), function (err) {
    if (err) throw err;
    console.log('Saved!');
  });

  

  const core_config = {
    Multicall:Multicall.address,
    CommunityFund:CommunityFund.address,
    PoolifyLastHarvestMulticall:PoolifyLastHarvestMulticall.address,
    PoolifyPriceMulticall:PoolifyPriceMulticall.address,
    PoolifyRewardManager:PoolifyRewardManager.address,
    PoolifyStrategyMulticall:PoolifyStrategyMulticall.address,
    PLFYToken:PLFYToken.address
  }

  /* Write Address of core */
  writeFile(`build/config/core/${network}.json`,JSON.stringify(core_config,null, 4), function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
};