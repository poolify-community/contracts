const networks        = require('../../utils/networks');


module.exports = function getConfiguration(props){
    const {tokenAddress,vaultContractAddress,network,...rest} = props;


    return     {
        id: 'poolify-maxi',
        logo: 'assets/tokens/poolify.png',
        name: 'POOLIFY Maxi',
        token: 'POOLIFY',
        tokenDescription: 'Poolify.Finance',
        tokenAddress: tokenAddress,
        tokenExplorer:networks.getExplorerUrl(network,tokenAddress),
        tokenDecimals: 18,
        //earnedToken: null,
        //earnedTokenAddress: null,
        //earnContractAddress: null,
        pricePerFullShare: 1,
        tvl: 0,
        oracle: 'tokens',
        oracleId: 'POOLIFY',
        oraclePrice: 0,
        depositsPaused: false,
        status: 'active',
        platform: 'Poolify.Finance',
        assets: ['POOLIFY'],
        stratType: 'SingleStake',
        withdrawalFee: '0.05%',
        buyTokenUrl: 'https://app.1inch.io/#/56/swap/BNB/POOLIFY',
        createdAt: 1606511757,// New fields start below v
        isPoolifyStaking:true,
        categories:['core','SingleAsset'],
        //tokenA:'POOLIFY',
        //tokenB:null,
        //tokenReward:'POOLIFY',
        //tokenVault:'POOLIFY',
        vaultTokenAddress:null, // It's staking, there is no token
        vaultContractAddress:vaultContractAddress,
        vaultExplorer:networks.getExplorerUrl(network,vaultContractAddress)
      }
}