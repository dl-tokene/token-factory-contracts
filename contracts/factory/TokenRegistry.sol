// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AbstractPoolContractsRegistry} from "@solarity/solidity-lib/contracts-registry/pools/AbstractPoolContractsRegistry.sol";

import {MasterAccessManagement} from "@tokene/core-contracts/core/MasterAccessManagement.sol";
import {MasterContractsRegistry} from "@tokene/core-contracts/core/MasterContractsRegistry.sol";

import {ITokenRegistry} from "../interfaces/factory/ITokenRegistry.sol";

/**
 * @notice The TokenRegistry contract which works together with the TokenFactory. It is used to store and upgrade the
 * deployed tokens. Integrated with the MasterAccessManagement contract.
 */
contract TokenRegistry is ITokenRegistry, AbstractPoolContractsRegistry {
    string public constant CREATE_PERMISSION = "CREATE";

    string public constant TOKEN_REGISTRY_RESOURCE = "TOKEN_REGISTRY_RESOURCE";

    string public constant TOKEN_FACTORY_DEP = "TOKEN_FACTORY";

    string public constant TERC20_NAME = "TERC20";
    string public constant TERC721_NAME = "TERC721";

    MasterAccessManagement internal _masterAccess;
    address internal _tokenFactory;

    modifier onlyCreatePermission() {
        _requirePermission(CREATE_PERMISSION);
        _;
    }

    modifier onlyTokenFactory() {
        require(_tokenFactory == msg.sender, "TokenRegistry: caller is not a factory");
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
        _tokenFactory = registry_.getContract(TOKEN_FACTORY_DEP);
    }

    /**
     * @inheritdoc ITokenRegistry
     */
    function setNewImplementations(
        string[] calldata names_,
        address[] calldata newImplementations_
    ) external override onlyCreatePermission {
        _setNewImplementations(names_, newImplementations_);
    }

    /**
     * @inheritdoc ITokenRegistry
     */
    function injectDependenciesToExistingPools(
        string calldata name_,
        uint256 offset_,
        uint256 limit_
    ) external override onlyCreatePermission {
        _injectDependenciesToExistingPools(name_, offset_, limit_);
    }

    /**
     * @inheritdoc ITokenRegistry
     */
    function injectDependenciesToExistingPoolsWithData(
        string calldata name_,
        bytes calldata data_,
        uint256 offset_,
        uint256 limit_
    ) external override onlyCreatePermission {
        _injectDependenciesToExistingPoolsWithData(name_, data_, offset_, limit_);
    }

    /**
     * @notice The function to add the proxy pool
     * @dev Access: TokenFactory
     * @param name_ the type of the pool
     * @param poolAddress_ the beacon proxy address of the pool
     */
    function addProxyPool(
        string memory name_,
        address poolAddress_
    ) public override onlyTokenFactory {
        _addProxyPool(name_, poolAddress_);
    }

    /**
     * @notice The internal function to optimize the bytecode for the permission check
     */
    function _requirePermission(string memory permission_) internal view {
        require(
            _masterAccess.hasPermission(msg.sender, TOKEN_REGISTRY_RESOURCE, permission_),
            "TokenRegistry: access denied"
        );
    }
}
