import { ethers } from "hardhat";

async function main() {
  const Token = await ethers.getContractFactory("TestUSDC");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const addr = await token.getAddress();
  console.log("TestUSDC deployed to:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
