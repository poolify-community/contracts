/** Contracts **/
const PoolifyVault    = artifacts.require('vaults/PoolifyVault');
const PoolifyChef     = artifacts.require('vaults/PoolifyChef');

const StrategyPLFY    = artifacts.require('strategies/Poolify/StrategyPLFY');
const PLFYToken       = artifacts.require('tokens/PLFYToken');


function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(deployer, network, accounts) {

    throw new Error('Not ready for PROD yet');
  
}
