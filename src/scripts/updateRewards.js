const MAXI_Vault    = artifacts.require('vaults/MAXI_Vault');
const PLFY_Vault    = artifacts.require('vaults/PLFY_Vault');

module.exports = async (callback) => {

  const _vault        = await PLFY_Vault.deployed();
  //const _vaultMaxi    = await MAXI_Vault.deployed();

  try{
    let _bw = await _vault.balance_want();
    console.log('_bw',_bw);
    let _b = await _vault.balance();
    console.log('_b',_b);
  }catch(e){
    console.log('error => ');
    console.error(e);
  }

  /*
  try{
    console.log('_vaultMaxi address',_vaultMaxi.address);
    //await _vaultMaxi.proposeStrat('0x5a6ED27aA7e3FeEB7208A8C59203Fb0bf9639390'); // 0xB4BC51a8D24a6C92EcEB4Fc678E52837069905FF
    await _vaultMaxi.upgradeStrat();
  }catch(e){
    console.log('error => ');
    console.error(e);
  }
  */
  
  // Code goes here...
  console.log("Vault updated");
  callback()
}
