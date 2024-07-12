import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { wei } from "@/scripts/utils/utils";
import { Reverter } from "@/test/helpers/reverter";

import {
  MINT_PERMISSION,
  BURN_PERMISSION,
  SPEND_PERMISSION,
  RECEIVE_PERMISSION,
  CHANGE_METADATA_PERMISSION,
  DefaultTERC20Params,
} from "../utils/constants";

import { MasterContractsRegistry, MasterAccessManagement, TERC20, IRBAC } from "@ethers-v6";

describe("TERC20", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const TERC20Role = "TERC20";
  const TERC20Resource = "TERC20";

  const TERC20Mint: IRBAC.ResourceWithPermissionsStruct = { resource: TERC20Resource, permissions: [MINT_PERMISSION] };
  const TERC20Receive: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC20Resource,
    permissions: [RECEIVE_PERMISSION],
  };
  const TERC20Burn: IRBAC.ResourceWithPermissionsStruct = { resource: TERC20Resource, permissions: [BURN_PERMISSION] };
  const TERC20Spend: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC20Resource,
    permissions: [SPEND_PERMISSION],
  };

  const TERC20ChangeMetadata: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC20Resource,
    permissions: [CHANGE_METADATA_PERMISSION],
  };

  let registry: MasterContractsRegistry;
  let masterAccess: MasterAccessManagement;
  let token: TERC20;

  before("setup", async () => {
    [OWNER, USER1, USER2, USER3] = await ethers.getSigners();

    const MasterContractsRegistry = await ethers.getContractFactory("MasterContractsRegistry");
    registry = await MasterContractsRegistry.deploy();

    const ReviewableRequests = await ethers.getContractFactory("ReviewableRequests");
    const _reviewableRequests = await ReviewableRequests.deploy();

    const MasterAccessManagement = await ethers.getContractFactory("MasterAccessManagement");
    const _masterAccess = await MasterAccessManagement.deploy();

    await registry.__MasterContractsRegistry_init(await _masterAccess.getAddress());

    masterAccess = MasterAccessManagement.attach(await registry.getMasterAccessManagement()) as MasterAccessManagement;
    await masterAccess.__MasterAccessManagement_init(OWNER);

    await registry.addProxyContract(await registry.REVIEWABLE_REQUESTS_NAME(), await _reviewableRequests.getAddress());

    await registry.injectDependencies(await registry.REVIEWABLE_REQUESTS_NAME());

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  async function deployTERC20(params: any) {
    const TERC20 = await ethers.getContractFactory("TERC20");
    token = await TERC20.deploy();

    await token.__TERC20_init(params, TERC20Resource);

    await token.setDependencies(await registry.getAddress(), "0x");
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployTERC20(DefaultTERC20Params);
    });

    it("should not initialize twice", async () => {
      await expect(token.__TERC20_init(DefaultTERC20Params, TERC20Resource)).to.be.rejectedWith(
        "Initializable: contract is already initialized",
      );
    });

    it("only injector should set dependencies", async () => {
      await expect(token.connect(USER1).setDependencies(await registry.getAddress(), "0x")).to.be.rejectedWith(
        "Dependant: not an injector",
      );
    });
  });

  describe("mintTo", () => {
    it("should be able to mint tokens", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      expect(await token.balanceOf(USER2)).to.be.equal(0);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      expect(await token.balanceOf(USER2)).to.be.equal(wei("100"));
    });

    it("should be able to mint capped tokens", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        decimals: 18,
        totalSupplyCap: wei("100"),
      };

      await deployTERC20(tokenParams);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      expect(await token.balanceOf(USER2)).to.be.equal(0);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      expect(await token.balanceOf(USER2)).to.be.equal(wei("100"));
    });

    it("should not exceed the cap", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        decimals: 18,
        totalSupplyCap: wei("100"),
      };

      await deployTERC20(tokenParams);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER1).mintTo(USER2, wei("1000"))).to.be.rejectedWith("TERC20: cap exceeded");
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Receive], true);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER1).mintTo(USER2, wei("100"))).to.be.rejectedWith("TERC20: access denied");
    });

    it("should not be able to mint tokens due to permissions (2)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);

      await expect(token.connect(USER1).mintTo(USER2, wei("100"))).to.be.rejectedWith("TERC20: access denied");
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Burn], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));
      await token.connect(USER2).burnFrom(USER2, wei("100"));

      expect(await token.balanceOf(USER2)).to.be.equal(0);
    });

    it("should be able to burn approved tokens", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Burn], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      await expect(token.connect(USER1).burnFrom(USER2, wei("100"))).to.be.rejectedWith(
        "ERC20: insufficient allowance",
      );

      await token.connect(USER2).approve(USER1, wei("100"));

      await token.connect(USER1).burnFrom(USER2, wei("100"));

      expect(await token.balanceOf(USER2)).to.be.equal(0);
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      await token.connect(USER2).approve(USER1, wei("100"));

      await expect(token.connect(USER1).burnFrom(USER2, wei("100"))).to.be.rejectedWith("TERC20: access denied");
      await expect(token.connect(USER2).burnFrom(USER2, wei("100"))).to.be.rejectedWith("TERC20: access denied");
    });

    it("should not burn tokens due to the permissions (2)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Burn], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));
      await token.connect(USER2).approve(USER1, wei("100"));

      await masterAccess.revokeRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER1).burnFrom(USER2, wei("100"))).to.be.rejectedWith("TERC20: access denied");
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Spend], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      await token.connect(USER2).transfer(USER1, wei("10"));

      expect(await token.balanceOf(USER1)).to.be.equal(wei("10"));
    });

    it("should be able to transfer from tokens", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Spend], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));
      await token.connect(USER2).approve(USER3, wei("20"));
      await token.connect(USER3).transferFrom(USER2, USER1, wei("20"));

      expect(await token.balanceOf(USER1)).to.be.equal(wei("20"));
    });

    it("should not transfer tokens due to permissions (1)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Spend], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      await masterAccess.revokeRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER2).transfer(USER1, wei("10"))).to.be.rejectedWith("TERC20: access denied");

      await masterAccess.revokeRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER2).transfer(USER1, wei("10"))).to.be.rejectedWith("TERC20: access denied");
    });

    it("should not transfer from due to permissions (2)", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20Mint, TERC20Receive, TERC20Spend], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await token.connect(USER1).mintTo(USER2, wei("100"));

      await token.connect(USER2).approve(USER3, wei("20"));

      await masterAccess.revokeRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER3).transferFrom(USER2, USER1, wei("20"))).to.be.rejectedWith(
        "TERC20: access denied",
      );

      await masterAccess.revokeRoles(USER1, [TERC20Role]);
      await masterAccess.grantRoles(USER2, [TERC20Role]);

      await expect(token.connect(USER3).transferFrom(USER2, USER1, wei("20"))).to.be.rejectedWith(
        "TERC20: access denied",
      );
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployTERC20(DefaultTERC20Params);

      await masterAccess.addPermissionsToRole(TERC20Role, [TERC20ChangeMetadata], true);
      await masterAccess.grantRoles(USER1, [TERC20Role]);

      expect(await token.contractURI()).to.be.equal(DefaultTERC20Params.contractURI);

      await token.connect(USER1).setContractMetadata("NEW_URI");

      expect(await token.contractURI()).to.be.equal("NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployTERC20(DefaultTERC20Params);

      await expect(token.connect(USER1).setContractMetadata("NEW_URI")).to.be.rejectedWith("TERC20: access denied");
    });
  });
});
