// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20Like {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

interface IMerchantRegistry {
    function isActive(bytes32 merchantId) external view returns (bool);
    function payoutAddress(bytes32 merchantId) external view returns (address);
}

contract BlockpointInvoiceRouter is Ownable, ReentrancyGuard {
    struct Invoice {
        bytes32 merchantId;
        address token;
        uint256 amount;
        uint64 expiry;
        bool paid;
    }

    IMerchantRegistry public registry;
    address public feeCollector;
    uint16 public feeBps;

    mapping(bytes32 => Invoice) public invoices;

    event InvoiceCreated(bytes32 indexed invoiceId, bytes32 indexed merchantId, uint256 amount);
    event InvoicePaid(bytes32 indexed invoiceId, address payer, uint256 amount, uint256 fee);

    constructor(
        address owner,
        address registry_,
        address feeCollector_,
        uint16 feeBps_
    ) Ownable(owner) {
        registry = IMerchantRegistry(registry_);
        feeCollector = feeCollector_;
        feeBps = feeBps_;
    }

    function createInvoice(
        bytes32 invoiceId,
        bytes32 merchantId,
        address token,
        uint256 amount,
        uint64 expiry
    ) external onlyOwner {
        require(registry.isActive(merchantId), "merchant inactive");
        require(invoices[invoiceId].merchantId == bytes32(0), "exists");

        invoices[invoiceId] = Invoice(merchantId, token, amount, expiry, false);
        emit InvoiceCreated(invoiceId, merchantId, amount);
    }

    function payInvoice(bytes32 invoiceId) external nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        require(!inv.paid, "paid");
        require(inv.expiry == 0 || block.timestamp <= inv.expiry, "expired");

        address payout = registry.payoutAddress(inv.merchantId);
        require(payout != address(0), "no payout");

        uint256 fee = (inv.amount * feeBps) / 10_000;
        uint256 net = inv.amount - fee;

        IERC20Like(inv.token).transferFrom(msg.sender, payout, net);
        IERC20Like(inv.token).transferFrom(msg.sender, feeCollector, fee);

        inv.paid = true;
        emit InvoicePaid(invoiceId, msg.sender, inv.amount, fee);
    }
}