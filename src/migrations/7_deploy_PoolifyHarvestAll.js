/** Libraries */
const web3 = require('web3');
const BigNumber = require('bignumber.js');

// core
const PoolifyHarvestAll     = artifacts.require("protocol/PoolifyHarvestAll.sol");

const tokens = function(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;
  await deployer.deploy(PoolifyHarvestAll);
  const _PoolifyHarvestAll = await PoolifyHarvestAll.deployed();
}
