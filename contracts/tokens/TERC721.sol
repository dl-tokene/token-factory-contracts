// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import {AbstractDependant} from "@solarity/solidity-lib/contracts-registry/AbstractDependant.sol";

import {MasterAccessManagement} from "@tokene/core-contracts/core/MasterAccessManagement.sol";
import {MasterContractsRegistry} from "@tokene/core-contracts/core/MasterContractsRegistry.sol";

import {ContractMetadata} from "../metadata/ContractMetadata.sol";

import {ITERC721} from "../interfaces/tokens/ITERC721.sol";

/**
 * @notice THe TERC721, standard realization. Requires permissions for interaction.
 */
contract TERC721 is
    ITERC721,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ContractMetadata,
    AbstractDependant
{
    string public constant MINT_PERMISSION = "MINT";
    string public constant BURN_PERMISSION = "BURN";
    string public constant SPEND_PERMISSION = "SPEND";
    string public constant RECEIVE_PERMISSION = "RECEIVE";

    string public TERC721_RESOURCE;

    MasterAccessManagement internal _masterAccess;

    string public baseURI;
    uint256 public totalSupplyCap;

    /**
     * @notice The initializer function
     * @param params_ the constructor params
     * @param resource_ the TERC721 resource to be used for RBAC
     */
    function __TERC721_init(
        ConstructorParams calldata params_,
        string calldata resource_
    ) external initializer {
        __ERC721_init(params_.name, params_.symbol);
        __ContractMetadata_init(params_.contractURI);

        TERC721_RESOURCE = resource_;

        baseURI = params_.baseURI;

        totalSupplyCap = params_.totalSupplyCap;
    }

    modifier onlyChangeMetadataPermission() override {
        _requirePermission(msg.sender, CHANGE_METADATA_PERMISSION);
        _;
    }

    /**
     * @notice The function to set dependencies
     * @dev Access: the injector address
     * @param registryAddress_ the ContractsRegistry address
     */
    function setDependencies(address registryAddress_, bytes memory) public override dependant {
        MasterContractsRegistry registry_ = MasterContractsRegistry(registryAddress_);

        _masterAccess = MasterAccessManagement(registry_.getMasterAccessManagement());
    }

    /**
     * @inheritdoc ITERC721
     */
    function mintTo(
        address receiver_,
        uint256 tokenId_,
        string calldata tokenURI_
    ) external override {
        require(
            totalSupplyCap == 0 || totalSupply() + 1 <= totalSupplyCap,
            "TERC721: cap exceeded"
        );

        _mint(receiver_, tokenId_);
        _setTokenURI(tokenId_, tokenURI_);
    }

    /**
     * @inheritdoc ITERC721
     */
    function burnFrom(address payer_, uint256 tokenId_) external override {
        require(
            ownerOf(tokenId_) == payer_ &&
                (payer_ == msg.sender ||
                    (getApproved(tokenId_) == msg.sender || isApprovedForAll(payer_, msg.sender))),
            "TERC721: not approved"
        );

        _burn(tokenId_);
    }

    /**
     * @inheritdoc ITERC721
     */
    function setBaseURI(string calldata baseURI_) external override onlyChangeMetadataPermission {
        baseURI = baseURI_;
    }

    /**
     * @inheritdoc ITERC721
     */
    function setTokenURI(
        uint256 tokenId_,
        string calldata tokenURI_
    ) external override onlyChangeMetadataPermission {
        _setTokenURI(tokenId_, tokenURI_);
    }

    /**
     * @notice The function to get the token URI
     * @param tokenId_ the token
     * @return token metadata
     */
    function tokenURI(
        uint256 tokenId_
    )
        public
        view
        override(ERC721URIStorageUpgradeable, ERC721Upgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId_);
    }

    /**
     * @notice The function to check what interfaces the contract supports
     * @param interfaceId_ the interface id
     * @return true if interfaceId is supported, false otherwise
     */
    function supportsInterface(
        bytes4 interfaceId_
    )
        public
        view
        override(ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return interfaceId_ == type(ITERC721).interfaceId || super.supportsInterface(interfaceId_);
    }

    /**
     * @notice The internal burn function
     */
    function _burn(
        uint256 tokenId_
    ) internal override(ERC721URIStorageUpgradeable, ERC721Upgradeable) {
        super._burn(tokenId_);
    }

    /**
     * @notice The internal function that checks permissions on mint, burn and transfer
     */
    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 tokenId_,
        uint256 batchSize_
    ) internal override(ERC721EnumerableUpgradeable, ERC721Upgradeable) {
        super._beforeTokenTransfer(from_, to_, tokenId_, batchSize_);

        if (from_ == address(0)) {
            _requirePermission(msg.sender, MINT_PERMISSION);
            _requirePermission(to_, RECEIVE_PERMISSION);
        } else if (to_ == address(0)) {
            _requirePermission(from_, BURN_PERMISSION);
        } else {
            _requirePermission(from_, SPEND_PERMISSION);
            _requirePermission(to_, RECEIVE_PERMISSION);
        }
    }

    /**
     * @notice The internal function to optimize the bytecode for the permission check
     */
    function _requirePermission(address account_, string memory permission_) internal view {
        require(
            _masterAccess.hasPermission(account_, TERC721_RESOURCE, permission_),
            "TERC721: access denied"
        );
    }

    /**
     * @notice The internal function to return the base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
