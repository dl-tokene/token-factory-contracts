import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import { CREATE_PERMISSION, TOKEN_REGISTRY_RESOURCE, TOKEN_REGISTRY_DEP, TOKEN_FACTORY_DEP } from "../utils/constants";

import { MasterContractsRegistry, MasterAccessManagement, TokenRegistry, TERC20, IRBAC } from "@ethers-v6";

describe("TokenRegistry", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let FACTORY: SignerWithAddress;

  const TokenRegistryRole = "TR";

  const TokenRegistryCreate: IRBAC.ResourceWithPermissionsStruct = {
    resource: TOKEN_REGISTRY_RESOURCE,
    permissions: [CREATE_PERMISSION],
  };

  let registry: MasterContractsRegistry;
  let masterAccess: MasterAccessManagement;
  let tokenRegistry: TokenRegistry;
  let token: TERC20;

  before("setup", async () => {
    [OWNER, USER1, FACTORY] = await ethers.getSigners();

    const MasterContractsRegistry = await ethers.getContractFactory("MasterContractsRegistry");
    registry = await MasterContractsRegistry.deploy();

    const MasterAccessManagement = await ethers.getContractFactory("MasterAccessManagement");
    const _masterAccess = await MasterAccessManagement.deploy();

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const _tokenRegistry = await TokenRegistry.deploy();

    const TERC20Factory = await ethers.getContractFactory("TERC20");
    token = await TERC20Factory.deploy();

    await registry.__MasterContractsRegistry_init(await _masterAccess.getAddress());

    masterAccess = MasterAccessManagement.attach(await registry.getMasterAccessManagement()) as MasterAccessManagement;
    await masterAccess.__MasterAccessManagement_init(OWNER);

    await registry.addProxyContract(TOKEN_REGISTRY_DEP, await _tokenRegistry.getAddress());

    await registry.addContract(TOKEN_FACTORY_DEP, FACTORY);

    tokenRegistry = TokenRegistry.attach(await registry.getContract(TOKEN_REGISTRY_DEP)) as TokenRegistry;

    await registry.injectDependencies(TOKEN_REGISTRY_DEP);

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await expect(tokenRegistry.setDependencies(await registry.getAddress(), "0x")).to.be.rejectedWith(
        "Dependant: not an injector",
      );
    });
  });

  describe("setNewImplementations", () => {
    it("should set new implementations", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await masterAccess.addPermissionsToRole(TokenRegistryRole, [TokenRegistryCreate], true);
      await masterAccess.grantRoles(USER1, [TokenRegistryRole]);

      await expect(tokenRegistry.getImplementation(name)).to.be.rejectedWith(
        "PoolContractsRegistry: this mapping doesn't exist",
      );

      await tokenRegistry.connect(USER1).setNewImplementations([name], [await token.getAddress()]);

      expect(await tokenRegistry.getImplementation(name)).to.be.equal(await token.getAddress());
    });

    it("should not set new implementations due to permissions", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await expect(
        tokenRegistry.connect(USER1).setNewImplementations([name], [await token.getAddress()]),
      ).to.be.rejectedWith("TokenRegistry: access denied");
    });
  });

  describe("addProxyPool", () => {
    it("should add proxy pool", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      expect(await tokenRegistry.listPools(name, 0, 1)).to.be.deep.equal([]);

      await tokenRegistry.connect(FACTORY).addProxyPool(name, await token.getAddress());

      expect(await tokenRegistry.listPools(name, 0, 1)).to.be.deep.equal([await token.getAddress()]);
    });

    it("should not add proxy pool not from factory", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await expect(tokenRegistry.addProxyPool(name, await token.getAddress())).to.be.rejectedWith(
        "TokenRegistry: caller is not a factory",
      );
    });
  });

  describe("injectDependenciesToExistingPools", () => {
    it("should inject dependencies", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await masterAccess.addPermissionsToRole(TokenRegistryRole, [TokenRegistryCreate], true);
      await masterAccess.grantRoles(USER1, [TokenRegistryRole]);

      await tokenRegistry.connect(FACTORY).addProxyPool(name, await token.getAddress());

      await expect(tokenRegistry.connect(USER1).injectDependenciesToExistingPools(name, 0, 1)).to.be.eventually
        .fulfilled;
    });

    it("should not inject dependencies due to permissions", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await expect(tokenRegistry.connect(USER1).injectDependenciesToExistingPools(name, 0, 1)).to.be.rejectedWith(
        "TokenRegistry: access denied",
      );
    });
  });

  describe("injectDependenciesToExistingPoolsWithData", () => {
    it("should inject dependencies", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await masterAccess.addPermissionsToRole(TokenRegistryRole, [TokenRegistryCreate], true);
      await masterAccess.grantRoles(USER1, [TokenRegistryRole]);

      await tokenRegistry.connect(FACTORY).addProxyPool(name, await token.getAddress());

      await expect(tokenRegistry.connect(USER1).injectDependenciesToExistingPoolsWithData(name, "0x", 0, 1)).to.be
        .eventually.fulfilled;
    });

    it("should not inject dependencies due to permissions", async () => {
      const name = await tokenRegistry.TERC20_NAME();

      await expect(
        tokenRegistry.connect(USER1).injectDependenciesToExistingPoolsWithData(name, "0x11", 0, 1),
      ).to.be.rejectedWith("TokenRegistry: access denied");
    });
  });
});
