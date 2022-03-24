/** Libraries */
const { artifacts } = require('hardhat');
const web3 = require('web3');

// core
const PLFYToken         = artifacts.require("tokens/PLFYToken.sol");
const TestRequestPoolify = artifacts.require("protocols/TestRequestPoolify")

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}


module.exports = async function(callback) {
    let accountId = '0x86d3a6051691171865acbf5Ef51cdF2e2E556fD9';

    console.log(`>  Minting PLFY to ${accountId}`);
    const _poolifyToken = await PLFYToken.deployed();
  
    try{
      await _poolifyToken.mint(accountId,tokens('100000'));
    }catch(e){
      console.log(e);
    }

    callback();
  }
  
