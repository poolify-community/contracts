/** Methods  **/
const chai = require('chai');
const BigNumber = require('bignumber.js');
const { artifacts } = require("hardhat");
const { assert } = chai;

/** Contracts **/
const TestRequestPoolify = artifacts.require('protocol/TestRequestPoolify');
const PLFYToken      = artifacts.require('tokens/PLFYToken');

const ACC_PRECISION = '1e18';

//const TokenFarm = artifacts.require('TokenFarm')

chai.use(require('chai-as-promised')).should();

//use default BigNumber

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}

const formatter = (val) =>{
  return new BigNumber(val).dividedBy(ACC_PRECISION);
}

contract('BetaTest - PLFY Distribution', ([dev,alice,bob]) => {
  let  _poolifyToken,_TestRequestPoolify;

  async function generatingData(){

          
        // Load PLFY  
         _poolifyToken = await PLFYToken.new();


        _TestRequestPoolify = await TestRequestPoolify.new(_poolifyToken.address);
        // Provide PLFY to Alice & Bob

        await _poolifyToken.mint(alice,tokens('100'));
        await _poolifyToken.mint(bob,tokens('100'));
        await _poolifyToken.mint(_TestRequestPoolify.address,tokens('300000'));
  }

    
    context("> Test", async () => {

      before(async () => {
        await generatingData();
      })

      it('Test Bob Request', async () => {
        // 1. Check the balance
        assert.equal(formatter(await _poolifyToken.balanceOf(alice)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'100');
        assert.equal(formatter(await _poolifyToken.balanceOf(_TestRequestPoolify.address)).toString(),'300000');

        // 2. Bob Request tokens
        assert.equal(await _TestRequestPoolify.isRequestAvailable({from:bob}),true);
        await _TestRequestPoolify.request({from:bob});
        assert.equal(await _TestRequestPoolify.isRequestAvailable({from:bob}),false);
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'10100');

        await _TestRequestPoolify.request({from:bob});
        assert.equal(formatter(await _poolifyToken.balanceOf(bob)).toString(),'10100');
        
      });




    })

  






})