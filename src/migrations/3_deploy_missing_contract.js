/** Libraries */
const web3 = require('web3');
/** Contracts **/


// core
const Multicall         = artifacts.require("protocol/Multicall.sol");



module.exports = async function(deployer, network, accounts) {
  const [admin,_] = accounts;
  let networkId = deployer.networks[network].network_id;

  // Deploy All multicalls
  await deployer.deploy(Multicall);
  const _Multicall = await Multicall.deployed();

 
}

