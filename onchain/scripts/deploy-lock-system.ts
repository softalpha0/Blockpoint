import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const LOCK_DURATION = 7 * 24 * 60 * 60;

  const TestUSDC = await ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();

  const BPT = await ethers.getContractFactory("BPT");
  const bpt = await BPT.deploy();
  await bpt.waitForDeployment();
  const bptAddr = await bpt.getAddress();

  const LockVault = await ethers.getContractFactory("LockVault");
  const lock = await LockVault.deploy(usdcAddr, bptAddr, LOCK_DURATION);
  await lock.waitForDeployment();
  const lockAddr = await lock.getAddress();

  const tx = await bpt.setMinter(lockAddr, true);
  await tx.wait();

  console.log("TestUSDC:", usdcAddr);
  console.log("BPT:", bptAddr);
  console.log("LockVault:", lockAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
