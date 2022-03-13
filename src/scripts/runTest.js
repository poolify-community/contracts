const { spawn } = require("child_process");

const run = async () => {
  console.log("📄 Running Unit Tests...");
  try {
    spawn(
      "cd src && npx hardhat test ",
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