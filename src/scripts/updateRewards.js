const PoolifyRewardManager = artifacts.require('vaults/PoolifyRewardManager');

module.exports = async function(callback) {

  const _vault        = await PLFY_Vault.deployed();
  const _vaultMaxi    = await MAXI_Vault.deployed();

  await _vault.proposeStrat('0xB4BC51a8D24a6C92EcEB4Fc678E52837069905FF'); // 0xB4BC51a8D24a6C92EcEB4Fc678E52837069905FF
  await _vault.upgradeStrat();
  
  // Code goes here...
  console.log("Vault updated");
  callback()
}
