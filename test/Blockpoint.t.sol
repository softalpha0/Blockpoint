// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../src/BlockpointMerchantRegistry.sol";
import "../src/BlockpointInvoiceRouter.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract BlockpointTest is Test {
    MockUSDC usdc;
    BlockpointMerchantRegistry registry;
    BlockpointInvoiceRouter router;

    address owner = address(1);
    address merchant = address(2);
    address user = address(3);
    address feeCollector = address(4);

    bytes32 merchantId = keccak256("merchant");
    bytes32 invoiceId = keccak256("invoice");

    function setUp() public {
        usdc = new MockUSDC();
        registry = new BlockpointMerchantRegistry(owner);

        vm.prank(owner);
        registry.registerMerchant(merchantId, merchant, keccak256("meta"));

        router = new BlockpointInvoiceRouter(
            owner,
            address(registry),
            feeCollector,
            50
        );

        vm.prank(owner);
        router.createInvoice(
            invoiceId,
            merchantId,
            address(usdc),
            1_000_000,
            uint64(block.timestamp + 1 days)
        );

        usdc.mint(user, 2_000_000);
    }

    function testPaymentWorks() public {
        vm.startPrank(user);
        usdc.approve(address(router), 1_000_000);
        router.payInvoice(invoiceId);
        vm.stopPrank();

        assertEq(usdc.balanceOf(merchant), 995_000);
        assertEq(usdc.balanceOf(feeCollector), 5_000);
    }
}