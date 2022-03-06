var fs = require("fs");
const contractNames = ['PLFYToken','PoolifyVault','PoolifyChef','StrategyPLFY'];

const copyFile = (fileName) => {
  fs.copyFile(
    `build/contracts/${fileName}.json`,
    `../src/abis/${fileName}.json`,
    (err) => {
      if (err) throw err;
      console.log(`✅ ${fileName} ABI was copied to the frontend`);
    },
  );
}


contractNames.forEach(fileName => {
  //copyFile(fileName);
})
