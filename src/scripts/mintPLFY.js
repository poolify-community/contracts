/** Libraries */
const web3 = require('web3');

// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(callback) {
    let accountId = '0x5708b667c35905FbB5Be06DB8d57e20304E0aeeE';

    console.log(`>  Minting PLFY to ${accountId}`);
    const _poolifyToken = await PLFYToken.deployed();
  
    await _poolifyToken.mint(accountId,tokens('10000'));

    callback();
  }
  
