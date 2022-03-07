

const writeFile = require('./utils/writeFile');
const networks  = require('./utils/networks');
const customConsole = require('./utils/formatter');
const fs        = require("fs");

const run = async () => {
    console.log(`⚙️  Initial Setup, Creation of the Wallet Config File`);
    
  
    const walletConfig = {};
    Object.keys(networks.networks).forEach(item => {
      walletConfig[item] = null;
    });

    let filePath = 'wallet.config2.json';

    if(fs.existsSync(filePath)){
      customConsole.error('wallet.config.json already exist !'); 
    }else{
      writeFile(filePath,JSON.stringify(walletConfig,null, 2), function (err) {
        if (err){
          customConsole.error(err); 
          throw err;
        }
      });
    }
};

run();
