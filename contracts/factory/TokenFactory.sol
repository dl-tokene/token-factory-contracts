// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {AbstractPoolFactory} from "@solarity/solidity-lib/contracts-registry/pools/pool-factory/AbstractPoolFactory.sol";

import {ReviewableRequests} from "@tokene/core-contracts/core/ReviewableRequests.sol";
import {MasterContractsRegistry} from "@tokene/core-contracts/core/MasterContractsRegistry.sol";
import {MasterAccessManagement} from "@tokene/core-contracts/core/MasterAccessManagement.sol";

import {ITERC20} from "../interfaces/tokens/ITERC20.sol";
import {ITERC721} from "../interfaces/tokens/ITERC721.sol";
import {ITokenFactory} from "../interfaces/factory/ITokenFactory.sol";

import {TERC20} from "../tokens/TERC20.sol";
import {TERC721} from "../tokens/TERC721.sol";
import {TokenRegistry} from "./TokenRegistry.sol";

/**
 * @notice The TokenFactory contract which is a part of the token factory TokenE module. It is used to request the deployment of
 * TERC20 and TERC721 tokens via the ReviewableRequests core contract. Deploys beacon proxies.
 *
 * The access control is realized via MasterAccessManagement.
 */
contract TokenFactory is ITokenFactory, AbstractPoolFactory {
    using Strings for uint256;

    string public constant CREATE_PERMISSION = "CREATE";
    string public constant EXECUTE_PERMISSION = "EXECUTE";

    string public constant TOKEN_FACTORY_RESOURCE = "TOKEN_FACTORY_RESOURCE";

    string public constant TOKEN_REGISTRY_DEP = "TOKEN_REGISTRY";

    MasterAccessManagement internal _masterAccess;
    ReviewableRequests internal _reviewableRequests;
    TokenRegistry internal _tokenRegistry;

    modifier onlyCreatePermission() {
        _requirePermission(CREATE_PERMISSION);
        _;
    }

    modifier onlyExecutePermission() {
        _requirePermission(EXECUTE_PERMISSION);
        _;
    }

    /**
     * @notice The function to set dependencies
     * @dev Access: the injector address
     * @param registryAddress_ the ContractsRegistry address
     * @param data_ empty additional data
     */
    function setDependencies(address registryAddress_, bytes memory data_) public override {
        super.setDependencies(registryAddress_, data_);

        MasterContractsRegistry registry_ = MasterContractsRegistry(registryAddress_);

        _masterAccess = MasterAccessManagement(registry_.getMasterAccessManagement());
        _reviewableRequests = ReviewableRequests(registry_.getReviewableRequests());
        _tokenRegistry = TokenRegistry(registry_.getContract(TOKEN_REGISTRY_DEP));
    }

    /**
     * @inheritdoc ITokenFactory
     */
    function requestTERC20(
        ITERC20.ConstructorParams calldata params_,
        string calldata description_
    ) external override onlyCreatePermission {
        bytes memory data_ = abi.encodeWithSelector(this.deployTERC20.selector, params_);

        _reviewableRequests.createRequest(address(this), data_, "", "TERC20", description_);
    }

    /**
     * @inheritdoc ITokenFactory
     */
    function deployTERC20(
        ITERC20.ConstructorParams calldata params_
    ) external override onlyExecutePermission {
        string memory tokenType_ = _tokenRegistry.TERC20_NAME();

        address tokenProxy_ = _deploy(address(_tokenRegistry), tokenType_);

        string memory tokenResource_ = _getTokenResource(tokenType_, tokenProxy_);

        TERC20(tokenProxy_).__TERC20_init(params_, tokenResource_);

        _register(address(_tokenRegistry), tokenType_, tokenProxy_);
        _injectDependencies(address(_tokenRegistry), tokenProxy_);

        emit DeployedTERC20(tokenProxy_, params_);
    }

    /**
     * @inheritdoc ITokenFactory
     */
    function requestTERC721(
        ITERC721.ConstructorParams calldata params_,
        string calldata description_
    ) external override onlyCreatePermission {
        bytes memory data_ = abi.encodeWithSelector(this.deployTERC721.selector, params_);

        _reviewableRequests.createRequest(address(this), data_, "", "TERC721", description_);
    }

    /**
     * @inheritdoc ITokenFactory
     */
    function deployTERC721(
        ITERC721.ConstructorParams calldata params_
    ) external override onlyExecutePermission {
        string memory tokenType_ = _tokenRegistry.TERC721_NAME();

        address tokenProxy_ = _deploy(address(_tokenRegistry), tokenType_);

        string memory tokenResource_ = _getTokenResource(tokenType_, tokenProxy_);

        TERC721(tokenProxy_).__TERC721_init(params_, tokenResource_);

        _register(address(_tokenRegistry), tokenType_, tokenProxy_);
        _injectDependencies(address(_tokenRegistry), tokenProxy_);

        emit DeployedTERC721(tokenProxy_, params_);
    }

    /**
     * @notice The internal function to calculate the resource of the deployed tokens
     */
    function _getTokenResource(
        string memory tokenType_,
        address tokenProxy_
    ) internal pure returns (string memory) {
        return string.concat(tokenType_, ":", uint256(uint160(tokenProxy_)).toHexString(20));
    }

    /**
     * @notice The internal function to optimize the bytecode for the permission check
     */
    function _requirePermission(string memory permission_) internal view {
        require(
            _masterAccess.hasPermission(msg.sender, TOKEN_FACTORY_RESOURCE, permission_),
            "TokenFactory: access denied"
        );
    }
}
