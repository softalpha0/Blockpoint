
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BPT is ERC20, Ownable {
    mapping(address => bool) public minters;

    constructor() ERC20("Blockpoint Token", "BPT") Ownable(msg.sender) {}

    function setMinter(address m, bool ok) external onlyOwner {
        minters[m] = ok;
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "not minter");
        _mint(to, amount);
    }
}
