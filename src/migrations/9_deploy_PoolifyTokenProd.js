/** Libraries */
const web3 = require('web3');
const tokens = function(n) {
    return web3.utils.toWei(n, 'ether');
}
// core
const PLFYToken = artifacts.require('tokens/PLFYToken');
const Migrations = artifacts.require("Migrations");


module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;

  // Deploy PLFY Token
  await deployer.deploy(PLFYToken);
  const _poolifyToken = await PLFYToken.deployed();

  await _poolifyToken.mint(admin,tokens('10'));

  console.log('_poolifyToken.address',_poolifyToken.address);
}
