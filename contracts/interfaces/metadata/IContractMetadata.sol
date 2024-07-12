// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IContractMetadata {
    /**
     * @notice The event that gets emitted when contract metadata changes
     * @param contractURI new contract metadata URI
     */
    event ContractURIChanged(string contractURI);

    /**
     * @notice The function to change the metadata link
     * @dev Access: CHANGE_METADATA permission
     * @param contractURI_ new metadata URI
     */
    function setContractMetadata(string calldata contractURI_) external;

    /**
     * @notice The function to get the metadata link
     * @return metadata link
     */
    function contractURI() external view returns (string memory);
}
