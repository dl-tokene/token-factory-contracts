// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ITokenRegistry {
    /**
     * @notice The function to upgrade the specified pools. Leverages the beacon proxy pattern
     * @dev Access: CREATE permission
     * @param names_ the names of the pools to upgrade
     * @param newImplementations_ the implementations the pools will be upgraded with
     */
    function setNewImplementations(
        string[] calldata names_,
        address[] calldata newImplementations_
    ) external;

    /**
     * @notice The function to inject dependencies into the existing pools
     * @dev Access: CREATE permission
     * @param name_ the pool type to inject dependencies into
     * @param offset_ the starting index in the pools' array
     * @param limit_ the number of pools to update
     */
    function injectDependenciesToExistingPools(
        string calldata name_,
        uint256 offset_,
        uint256 limit_
    ) external;

    /**
     * @notice The function to inject dependencies into the existing pools with data
     * @dev Access: CREATE permission
     * @param name_ the pool type to inject dependencies into
     * @param data_ the additional data to be provided to the pool
     * @param offset_ the starting index in the pools' array
     * @param limit_ the number of pools to update
     */
    function injectDependenciesToExistingPoolsWithData(
        string calldata name_,
        bytes calldata data_,
        uint256 offset_,
        uint256 limit_
    ) external;
}
