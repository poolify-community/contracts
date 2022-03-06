const { spawn } = require("child_process");
var argv = require('minimist-lite')(process.argv.slice(2));


const run = async () => {
  console.log(`📄 Deploying and updating contracts... to ${argv.network}`);
  const command = `truffle migrate --reset --compile-all --network ${argv.network}`; // && node scripts/migrateABI.js
  try {
    spawn(
      command,
      {
        shell: true,
        stdio: "inherit",
      },
    );
  } catch (e) {
    console.log(e);
  }
};
run();
