const fs = require('fs');
const getDirName = require('path').dirname;

const PoolifyVault  = artifacts.require("vaults/PoolifyVault.sol");
const PLFYToken     = artifacts.require("tokens/PLFYToken.sol");
const poolifyMaxi_config = require('../scripts/deployments/vaults/poolifyMaxi');


function writeFile(path, contents, cb) {
  fs.mkdir(getDirName(path), { recursive: true}, function (err) {
    if (err) return cb(err);

    fs.writeFile(path, contents, cb);
  });
}


module.exports = function(deployer,network,accounts) {

  const config = [
    // POOLIFY MAXI
    poolifyMaxi_config({
      tokenAddress:PLFYToken.address,
      vaultContractAddress:PoolifyVault.address,
      network:network
    })

  ];


  writeFile(`build/config/${network}.json`,JSON.stringify(config,null, 4), function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
};