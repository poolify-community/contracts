

const explorers = {
    'local':'',
    'bsc':'https://testnet.bscscan.com/address',
    'bscTestNet':'https://testnet.bscscan.com/address'
}

const getExplorerUrl = function(network,address){
    return `${explorers[network]}/${address}`;
}


module.exports = {getExplorerUrl}