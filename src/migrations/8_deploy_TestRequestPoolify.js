/** Libraries */
const web3 = require('web3');
const BigNumber = require('bignumber.js');

// core
const TestRequestPoolify = artifacts.require('protocol/TestRequestPoolify');
const PLFYToken = artifacts.require('tokens/PLFYToken');


const tokens = function(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;
  const _poolifyToken = await PLFYToken.deployed();

  await deployer.deploy(TestRequestPoolify,_poolifyToken.address);
  
  const _TestRequestPoolify = await TestRequestPoolify.deployed();
}
