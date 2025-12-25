// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * SAVE vault: users deposit ERC20 assets, earn nothing.
 * Supports multiple tokens (USDC, USDT, etc).
 */
contract SavingsVault is Ownable {
    using SafeERC20 for IERC20;

    // token => allowed
    mapping(address => bool) public allowedToken;

    // user => token => balance
    mapping(address => mapping(address => uint256)) public balanceOf;

    event TokenAllowed(address token, bool allowed);
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function deposit(address token, uint256 amount) external {
        require(allowedToken[token], "Token not allowed");
        require(amount > 0, "Amount=0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "Amount=0");
        uint256 bal = balanceOf[msg.sender][token];
        require(bal >= amount, "Insufficient");

        balanceOf[msg.sender][token] = bal - amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }
}