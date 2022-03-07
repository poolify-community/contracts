
const networks = {
    'develop':{explorer:'http://localhost/address'},
    'bsc':{explorer:'https://testnet.bscscan.com/address'},
    'bscTestNet':{explorer:'https://testnet.bscscan.com/address'}
}

const getExplorerUrl = function(network,address){
    return `${networks[network]?.explorer}/${address}`;
}


module.exports = {getExplorerUrl,networks}