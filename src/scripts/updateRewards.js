const MAXI_Vault    = artifacts.require('vaults/MAXI_Vault');
const PLFY_Vault    = artifacts.require('vaults/PLFY_Vault');

module.exports = async (callback) => {

  const _vault        = await PLFY_Vault.deployed();
  //const _vaultMaxi    = await MAXI_Vault.deployed();


  
  try{
    console.log('_vaultMaxi address',_vault.address);
    //await _vaultMaxi.proposeStrat('0x5a6ED27aA7e3FeEB7208A8C59203Fb0bf9639390'); // 0xB4BC51a8D24a6C92EcEB4Fc678E52837069905FF
    await _vault.upgradeStrat();
  }catch(e){
    console.log('error => ');
    console.error(e);
  }
  
  
  // Code goes here...
  console.log("Vault updated");
  callback()
}
