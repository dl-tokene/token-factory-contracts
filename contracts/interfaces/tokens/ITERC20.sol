// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ITERC20 is IERC20Upgradeable {
    struct ConstructorParams {
        string name;
        string symbol;
        string contractURI;
        uint8 decimals;
        uint256 totalSupplyCap;
    }

    /**
     * @notice The function to mint the tokens
     * @dev Access: MINT permission for msg.sender, RECEIVE permission for the account_
     * @param account_ the account to mint tokens to
     * @param amount_ the minted amount
     */
    function mintTo(address account_, uint256 amount_) external;

    /**
     * @notice The function to burn the tokens
     * @dev Access: BURN permission for account_
     * @param account_ the account to burn tokens from
     * @param amount_ the burned amount
     */
    function burnFrom(address account_, uint256 amount_) external;
}
