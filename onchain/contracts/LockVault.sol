
pragma solidity ^0.8.20;

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address a) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IBPT {
    function mint(address to, uint256 amount) external;
}

contract LockVault {
    IERC20Like public immutable token;     
    IBPT public immutable bpt;            

    uint256 public immutable lockDuration; 

    mapping(address => uint256) public staked;      
    mapping(address => uint256) public unlockAt;    
    mapping(address => uint256) public lastClaimAt; 

    event Deposited(address indexed user, uint256 amount, uint256 unlockAt);
    event Withdrawn(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(address _token, address _bpt, uint256 _lockDuration) {
        require(_token != address(0) && _bpt != address(0), "bad addr");
        token = IERC20Like(_token);
        bpt = IBPT(_bpt);
        lockDuration = _lockDuration;
    }

    function _now() internal view returns (uint256) {
        return block.timestamp;
    }

    function pendingRewards(address user) public view returns (uint256) {
        uint256 s = staked[user];
        if (s == 0) return 0;

        uint256 last = lastClaimAt[user];
        if (last == 0) last = _now();
        if (_now() <= last) return 0;

        uint256 dt = _now() - last;

        uint256 s18 = s * 1e12;

        return (s18 * dt) / 1 days;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "amount=0");

        if (lastClaimAt[msg.sender] == 0) {
            lastClaimAt[msg.sender] = _now();
        }

        uint256 u = _now() + lockDuration;
        if (u > unlockAt[msg.sender]) unlockAt[msg.sender] = u;

        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        staked[msg.sender] += amount;

        emit Deposited(msg.sender, amount, unlockAt[msg.sender]);
    }

    function claim() external {
        uint256 r = pendingRewards(msg.sender);
        require(r > 0, "no rewards");
        lastClaimAt[msg.sender] = _now();
        bpt.mint(msg.sender, r);
        emit Claimed(msg.sender, r);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount=0");
        require(_now() >= unlockAt[msg.sender], "still locked");
        require(staked[msg.sender] >= amount, "insufficient");

        staked[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
}
