/** Libraries */
const web3 = require('web3');
const BigNumber = require('bignumber.js');

// core
const PoolifyRewardManager     = artifacts.require("protocol/PoolifyRewardManager.sol");

const tokens = function(n) {
  return web3.utils.toWei(n, 'ether');
}

const LPToken_Address = '0x976a7753c88EBFD2d3154B8764a0176769e5a372'; // BSC_TESTNET

module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;
  const _poolifyRewardManager = await PoolifyRewardManager.deployed();

  await _poolifyRewardManager.addPool(1000,LPToken_Address,false);
}
