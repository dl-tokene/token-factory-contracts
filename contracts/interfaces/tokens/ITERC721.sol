// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

interface ITERC721 is IERC721EnumerableUpgradeable {
    struct ConstructorParams {
        string name;
        string symbol;
        string contractURI;
        string baseURI;
        uint256 totalSupplyCap;
    }

    /**
     * @notice The function to mint the tokens
     * @dev Access: MINT permission for msg.sender, RECEIVE permission for the receiver_
     * @param receiver_ the account to mint the tokens to
     * @param tokenId_ the token to be minted
     * @param tokenURI_ the URI of the tokens metadata to be used
     */
    function mintTo(address receiver_, uint256 tokenId_, string calldata tokenURI_) external;

    /**
     * @notice The function to burn the tokens
     * @dev Access: BURN permission for payer_
     * @param payer_ the account to burn tokens from
     * @param tokenId_ the token to burn
     */
    function burnFrom(address payer_, uint256 tokenId_) external;

    /**
     * @notice The function to set the base metadata URI
     * @dev Access: CHANGE_METADATA permission
     * @param baseURI_ the new base URI
     */
    function setBaseURI(string calldata baseURI_) external;

    /**
     * @notice The function to set the individual token URI
     * @dev Access: CHANGE_METADATA permission
     * @param tokenId_ the token to change metadata of
     * @param tokenURI_ new token metadata
     */
    function setTokenURI(uint256 tokenId_, string calldata tokenURI_) external;
}
