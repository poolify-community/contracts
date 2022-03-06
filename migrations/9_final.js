var PoolifyVault = artifacts.require("vaults/PoolifyVault.sol");
var PLFYToken = artifacts.require("tokens/PLFYToken.sol");

module.exports = function(deployer) {
  // Output to console or a configuration file
  console.log({
    PLFYToken: PLFYToken.address,
    PoolifyVault: PoolifyVault.address,
  });
};