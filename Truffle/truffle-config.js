module.exports = {
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 7545,
      chainId: 1337,
      network_id: 5777,
      deploymentPollingInterval: 10,
    },
  },
  //contracts_directory: './src/contracts/',
  //contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      version:"0.8.11"
    }
  }
}
