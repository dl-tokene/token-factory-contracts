// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ITERC20} from "../tokens/ITERC20.sol";
import {ITERC721} from "../tokens/ITERC721.sol";

interface ITokenFactory {
    /**
     * @notice The event that gets emitted when new TERC20 token is deployed
     * @param token the address of the token
     * @param params the token constructor params
     */
    event DeployedTERC20(address token, ITERC20.ConstructorParams params);
    /**
     * @notice The event that gets emitted when new TERC721 token is deployed
     * @param token the address of the token
     * @param params the token constructor params
     */
    event DeployedTERC721(address token, ITERC721.ConstructorParams params);

    /**
     * @notice The function to request the deployment of TERC20 token
     * @dev Access: CREATE permission
     * @param params_ the constructor params of the TERC20 token
     * @param description_ the description of the reviewable request
     */
    function requestTERC20(
        ITERC20.ConstructorParams calldata params_,
        string calldata description_
    ) external;

    /**
     * @notice The function to deploy the requested TERC20 token. Will be called by a ReviewableRequests contract
     * @dev Access: EXECUTE permission
     * @param params_ the specified constructor params of the TERC20 token
     */
    function deployTERC20(ITERC20.ConstructorParams calldata params_) external;

    /**
     * @notice The function to deploy the requested TERC721 token. Will be called by a ReviewableRequests contract
     * @dev Access: EXECUTE permission
     * @param params_ the specified constructor params of the TERC721 token
     */
    function requestTERC721(
        ITERC721.ConstructorParams calldata params_,
        string calldata description_
    ) external;

    /**
     * @notice The function to deploy the requested TERC721 token. Will be called by a ReviewableRequests contract
     * @dev Access: EXECUTE permission
     * @param params_ the specified constructor params of the TERC721 token
     */
    function deployTERC721(ITERC721.ConstructorParams calldata params_) external;
}
