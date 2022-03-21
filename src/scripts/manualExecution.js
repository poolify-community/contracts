const PoolifyRewardManager = artifacts.require('vaults/PoolifyRewardManager');

module.exports = async function(callback) {
  let _poolifyRewardManager = await PoolifyRewardManager.deployed()
  await _poolifyRewardManager.setPoolifyPerBlock(0);
  // Code goes here...
  console.log("Pool updated");
  callback();
}
