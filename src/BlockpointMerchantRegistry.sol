// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockpointMerchantRegistry is Ownable {
    event MerchantRegistered(bytes32 indexed merchantId, address payoutAddress, bytes32 metadataHash);
    event MerchantStatusUpdated(bytes32 indexed merchantId, bool active);
    event MerchantPayoutUpdated(bytes32 indexed merchantId, address payoutAddress);

    struct Merchant {
        bool active;
        address payout;
        bytes32 metadataHash;
    }

    mapping(bytes32 => Merchant) private merchants;

    constructor(address owner) Ownable(owner) {}

    function registerMerchant(
    bytes32 merchantId,
    address payoutAddr,
    bytes32 metadataHash
) external onlyOwner {
    require(merchantId != bytes32(0), "bad merchantId");
    require(payoutAddr != address(0), "bad payout");
    require(merchants[merchantId].payout == address(0), "exists");

    merchants[merchantId] = Merchant(true, payoutAddr, metadataHash);
    emit MerchantRegistered(merchantId, payoutAddr, metadataHash);
}

    function payoutAddress(bytes32 merchantId) external view returns (address) {
        return merchants[merchantId].payout;
    }

    function isActive(bytes32 merchantId) external view returns (bool) {
        return merchants[merchantId].active;
    }
}