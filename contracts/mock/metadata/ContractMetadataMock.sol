// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ContractMetadata} from "../../metadata/ContractMetadata.sol";

contract ContractMetadataMock is ContractMetadata {
    function init(string calldata contractURI_) external {
        __ContractMetadata_init(contractURI_);
    }
}
