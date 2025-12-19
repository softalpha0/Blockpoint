// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import "../src/BlockpointMerchantRegistry.sol";
import "../src/BlockpointInvoiceRouter.sol";

contract Deploy is Script {
    function run() external {
        // Required env vars:
        // OWNER
        // FEE_COLLECTOR

        address owner = vm.envAddress("OWNER");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast();

        BlockpointMerchantRegistry registry = new BlockpointMerchantRegistry(owner);

        BlockpointInvoiceRouter router = new BlockpointInvoiceRouter(
            owner,
            address(registry),
            feeCollector,
            50 // 0.50%
        );

        vm.stopBroadcast();

        console2.log("MerchantRegistry:", address(registry));
        console2.log("InvoiceRouter:   ", address(router));
    }
}
