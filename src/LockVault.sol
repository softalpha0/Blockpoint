// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";


contract LockVault is ERC20, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;       
    IERC20 public immutable rewardToken;

    uint256 public accRewardPerShare; 
    mapping(address => uint256) public rewardDebt;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(
        address initialOwner,
        address _asset,
        address _rewardToken
    )
        ERC20("BlockPoint Token", "BPT") 
        Ownable(initialOwner)
    {
        require(_asset != address(0), "bad asset");
        require(_rewardToken != address(0), "bad reward");

        asset = IERC20(_asset);
        rewardToken = IERC20(_rewardToken);
    }

    function pendingReward(address user) public view returns (uint256) {
        uint256 shares = balanceOf(user);
        uint256 accumulated = (shares * accRewardPerShare) / 1e18;
        uint256 debt = rewardDebt[user];
        return accumulated > debt ? accumulated - debt : 0;
    }

    function _update(address user) internal {
        rewardDebt[user] = (balanceOf(user) * accRewardPerShare) / 1e18;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount=0");

        _claim(msg.sender);

        asset.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);

        _update(msg.sender);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient");

        _claim(msg.sender);

        _burn(msg.sender, amount);
        asset.safeTransfer(msg.sender, amount);

        _update(msg.sender);
        emit Withdrawn(msg.sender, amount);
    }

    function addReward(uint256 amount) external onlyOwner {
        require(totalSupply() > 0, "No shares");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        accRewardPerShare += (amount * 1e18) / totalSupply();
        emit RewardAdded(amount);
    }

    function claim() external {
        _claim(msg.sender);
        _update(msg.sender);
    }

    function _claim(address user) internal {
        uint256 reward = pendingReward(user);
        if (reward > 0) {
            rewardToken.safeTransfer(user, reward);
            emit RewardClaimed(user, reward);
        }
    }
}