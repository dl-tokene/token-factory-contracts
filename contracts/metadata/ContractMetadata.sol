// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IContractMetadata} from "../interfaces/metadata/IContractMetadata.sol";

/**
 * @notice The abstract ContractMetadata contract that tokens inherit.
 * Used to store a token's image and other offchain data
 */
abstract contract ContractMetadata is IContractMetadata, Initializable {
    string public constant CHANGE_METADATA_PERMISSION = "CHANGE_METADATA";

    string private _contractURI;

    /**
     * @notice The initializer function
     * @param contractURI_ the URI to the contract's metadata
     */
    function __ContractMetadata_init(string memory contractURI_) internal onlyInitializing {
        _contractURI = contractURI_;
    }

    modifier onlyChangeMetadataPermission() virtual {
        _;
    }

    /**
     * @inheritdoc IContractMetadata
     */
    function setContractMetadata(
        string calldata contractURI_
    ) external override onlyChangeMetadataPermission {
        _contractURI = contractURI_;

        emit ContractURIChanged(contractURI_);
    }

    /**
     * @inheritdoc IContractMetadata
     */
    function contractURI() external view override returns (string memory) {
        return _contractURI;
    }
}
