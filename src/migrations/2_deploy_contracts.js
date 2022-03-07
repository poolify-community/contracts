
// Deployment scripts
const develop_deployment    = require('../scripts/deployments/develop');
const bscTest_deployment    = require('../scripts/deployments/bscTest');
const bsc_deployment        = require('../scripts/deployments/bsc');

module.exports = async function(deployer, network, accounts) {

  switch(network){
    case 'bscTest':
      console.log('Deployment to network : BSC TEST NET')
      return bscTest_deployment;
    break;
    case 'develop':
      console.log('Deployment to network : DEVELOP')
      return develop_deployment;
    break;
    case 'bsc':
      console.log('Deployment to network : BSC MAIN NET')
      return bsc_deployment;
    ;
    default:
      throw new Error('Not supported yet');
    break;
  }
  
}
