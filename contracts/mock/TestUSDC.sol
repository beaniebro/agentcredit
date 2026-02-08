// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDC
 * @notice Mock USDC token for testing on Base Sepolia
 * @dev Unlimited minting for easy testing without faucet dependency
 */
contract TestUSDC is ERC20, Ownable {

    constructor() ERC20("Test USDC", "USDC") Ownable(msg.sender) {}

    /// @notice USDC uses 6 decimals (not 18)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address (unrestricted for testing)
    /// @param to Recipient address
    /// @param amount Amount to mint (in USDC units, 6 decimals)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Faucet function - anyone can get 1000 USDC
    function faucet() external {
        _mint(msg.sender, 1000 * 10**6); // 1000 USDC
    }

    /// @notice Burn tokens from caller
    /// @param amount Amount to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
