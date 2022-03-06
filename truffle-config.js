const HDWalletProvider = require('@truffle/hdwallet-provider');
const walletKeys = require('./wallet.config.json'); // simple mapping : {'bsc':'xxxxxxx','bscTest':'xxxxxx'}


module.exports = {
  networks: {
    bsc: {
      provider: () => new HDWalletProvider(
        walletKeys['bsc'], 
        'https://bsc-dataseed.binance.org/'
      ),
      network_id: 56,
      skipDryRun: true
    },
    bscTest: {
      provider: () => new HDWalletProvider(
        walletKeys['bscTest'], 
        'https://data-seed-prebsc-1-s1.binance.org:8545'
      ),
      network_id: 97,
      skipDryRun: true
    },
    develop: {
      host: "127.0.0.1",
      port: 7545,
      chainId: 1337,
      network_id: 5777,
      deploymentPollingInterval: 10,
    },
  },
  contracts_directory: './src/contracts/',
  migrations_directory:'./src/migrations/',
  contracts_build_directory: './build/abis/',
  compilers: {
    solc: {
      version:"0.8.11"
    }
  }
}
