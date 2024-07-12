import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  MINT_PERMISSION,
  BURN_PERMISSION,
  SPEND_PERMISSION,
  RECEIVE_PERMISSION,
  CHANGE_METADATA_PERMISSION,
  DefaultTERC721Params,
} from "../utils/constants";

import { MasterContractsRegistry, MasterAccessManagement, IRBAC, TERC721 } from "@ethers-v6";

describe("TERC721", async () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;
  let USER3: SignerWithAddress;

  const TERC721Role = "TERC721";
  const TERC721Resource = "TERC721";

  const TERC721Mint: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC721Resource,
    permissions: [MINT_PERMISSION],
  };
  const TERC721Receive: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC721Resource,
    permissions: [RECEIVE_PERMISSION],
  };
  const TERC721Burn: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC721Resource,
    permissions: [BURN_PERMISSION],
  };
  const TERC721Spend: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC721Resource,
    permissions: [SPEND_PERMISSION],
  };
  const TERC721ChangeMetadata: IRBAC.ResourceWithPermissionsStruct = {
    resource: TERC721Resource,
    permissions: [CHANGE_METADATA_PERMISSION],
  };

  let registry: MasterContractsRegistry;
  let masterAccess: MasterAccessManagement;
  let token: TERC721;

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

  async function deployTERC721(params: any) {
    const TERC721 = await ethers.getContractFactory("TERC721");
    token = await TERC721.deploy();

    await token.__TERC721_init(params, TERC721Resource);

    await token.setDependencies(await registry.getAddress(), "0x");
  }

  describe("access", () => {
    beforeEach("setup", async () => {
      await deployTERC721(DefaultTERC721Params);
    });

    it("should not initialize twice", async () => {
      await expect(token.__TERC721_init(DefaultTERC721Params, TERC721Resource)).to.be.rejectedWith(
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
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      expect(await token.balanceOf(USER2)).to.be.equal(0);

      await token.connect(USER1).mintTo(USER2, 1, "_1");

      expect(await token.balanceOf(USER2)).to.be.equal(1);

      expect(await token.tokenOfOwnerByIndex(USER2, 0)).to.be.equal(1);
      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_1");
    });

    it("should be able to mint capped tokens", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 2,
      };

      await deployTERC721(tokenParams);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      expect(await token.balanceOf(USER2)).to.be.equal(0);

      await token.connect(USER1).mintTo(USER2, 1, "1");
      await token.connect(USER1).mintTo(USER2, 3, "3");

      expect(await token.balanceOf(USER2)).to.be.equal(2);
      expect(await token.tokenOfOwnerByIndex(USER2, 0)).to.be.equal("1");
      expect(await token.tokenOfOwnerByIndex(USER2, 1)).to.be.equal("3");

      expect(await token.tokenURI(1)).to.be.equal("1");
      expect(await token.tokenURI(3)).to.be.equal("3");
    });

    it("should not exceed the cap", async () => {
      const tokenParams = {
        name: "name",
        symbol: "symbol",
        contractURI: "URI",
        baseURI: "",
        totalSupplyCap: 1,
      };

      await deployTERC721(tokenParams);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 2, "2");
      await expect(token.connect(USER1).mintTo(USER2, 3, "3")).to.be.rejectedWith("TERC721: cap exceeded");
    });

    it("should not be able to mint tokens due to permissions (1)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Receive], true);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER1).mintTo(USER2, 1, "1"), "TERC721: access denied");
    });

    it("should not be able to mint tokens due to permissions (2)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);

      await expect(token.connect(USER1).mintTo(USER2, 1, "1")).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("burnFrom", () => {
    it("should be able to burn tokens", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Burn], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");
      await token.connect(USER2).burnFrom(USER2, 1);

      expect(await token.balanceOf(USER2)).to.be.equal("0");

      await expect(token.tokenURI(1)).to.be.rejectedWith("ERC721: invalid token ID");
    });

    it("should be able to burn approved token", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Burn], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await expect(token.connect(USER1).burnFrom(USER2, 1)).to.be.rejectedWith("TERC721: not approved");

      await token.connect(USER2).approve(USER1, 1);

      await token.connect(USER1).burnFrom(USER2, 1);

      expect(await token.balanceOf(USER2)).to.be.equal("0");
    });

    it("should be able to burn approvedAll tokens", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Burn], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await expect(token.connect(USER1).burnFrom(USER2, 1)).to.be.rejectedWith("TERC721: not approved");

      await token.connect(USER2).setApprovalForAll(USER1, true);

      await token.connect(USER1).burnFrom(USER2, 1);

      expect(await token.balanceOf(USER2)).to.be.equal("0");
    });

    it("should not burn tokens due to the permissions (1)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await token.connect(USER2).approve(USER1, 1);

      await expect(token.connect(USER1).burnFrom(USER2, 1)).to.be.rejectedWith("TERC721: access denied");
      await expect(token.connect(USER2).burnFrom(USER2, 1)).to.be.rejectedWith("TERC721: access denied");
    });

    it("should not burn tokens due to the permissions (2)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Burn], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await token.connect(USER2).setApprovalForAll(USER1, true);

      await masterAccess.revokeRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER1).burnFrom(USER2, 1)).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("transfer", () => {
    it("should be able to transfer tokens", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Spend], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await token.connect(USER2).transferFrom(USER2, USER1, 1);

      expect(await token.balanceOf(USER1)).to.be.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER1, 0)).to.be.equal("1");
    });

    it("should be able to transfer from tokens", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Spend], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await token.connect(USER2).approve(USER3, 1);

      await token.connect(USER3).transferFrom(USER2, USER1, 1);

      expect(await token.balanceOf(USER1)).to.be.equal(1);
      expect(await token.tokenOfOwnerByIndex(USER1, 0)).to.be.equal("1");
    });

    it("should not transfer tokens due to permissions (1)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Spend], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await masterAccess.revokeRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER2).transferFrom(USER2, USER1, 1)).to.be.rejectedWith("TERC721: access denied");

      await masterAccess.revokeRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER2).transferFrom(USER2, USER1, 1)).to.be.rejectedWith("TERC721: access denied");
    });

    it("should not transfer from due to permissions (2)", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive, TERC721Spend], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await token.connect(USER1).mintTo(USER2, 1, "1");

      await token.connect(USER2).setApprovalForAll(USER3, true);

      await masterAccess.revokeRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER3).transferFrom(USER2, USER1, 1)).to.be.rejectedWith("TERC721: access denied");

      await masterAccess.revokeRoles(USER1, [TERC721Role]);
      await masterAccess.grantRoles(USER2, [TERC721Role]);

      await expect(token.connect(USER3).transferFrom(USER2, USER1, 1)).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("setContractMetadata", () => {
    it("should set new contract metadata", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721ChangeMetadata], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);

      expect(await token.contractURI()).to.be.equal(DefaultTERC721Params.contractURI);

      await token.connect(USER1).setContractMetadata("NEW_URI");

      expect(await token.contractURI()).to.be.equal("NEW_URI");
    });

    it("should not set contract metadata due to permissions", async () => {
      await deployTERC721(DefaultTERC721Params);

      await expect(token.connect(USER1).setContractMetadata("NEW_URI")).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("setBaseURI", () => {
    it("should set new base uri", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721ChangeMetadata], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);

      expect(await token.baseURI()).to.be.equal(DefaultTERC721Params.baseURI);

      await token.connect(USER1).setBaseURI("NEW_BASE_URI");

      expect(await token.baseURI()).to.be.equal("NEW_BASE_URI");
    });

    it("should not set base uri due to permissions", async () => {
      await deployTERC721(DefaultTERC721Params);

      await expect(token.connect(USER1).setBaseURI("NEW_BASE_URI")).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("setTokenURI", () => {
    beforeEach("setup", async () => {
      await deployTERC721(DefaultTERC721Params);

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721Mint, TERC721Receive], true);
      await masterAccess.grantRoles(USER1, [TERC721Role]);

      await token.connect(USER1).mintTo(USER1, 1, "1");
    });

    it("should set new token uri", async () => {
      expect(await token.tokenURI(1)).to.be.equal("BASE_URI1");

      await masterAccess.addPermissionsToRole(TERC721Role, [TERC721ChangeMetadata], true);

      await token.connect(USER1).setTokenURI(1, "_1");

      expect(await token.tokenURI(1)).to.be.equal("BASE_URI_1");
    });

    it("should not set token uri due to permissions", async () => {
      await expect(token.connect(USER1).setTokenURI(1, "_1")).to.be.rejectedWith("TERC721: access denied");
    });
  });

  describe("supportsInterface", () => {
    it("should support interfaces", async () => {
      await deployTERC721(DefaultTERC721Params);

      expect(await token.supportsInterface("0xa57a25b8")).to.be.true;
      expect(await token.supportsInterface("0x780e9d63")).to.be.true;
    });
  });
});
