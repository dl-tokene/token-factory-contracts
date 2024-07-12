import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Reverter } from "@/test/helpers/reverter";

import {
  CREATE_PERMISSION,
  EXECUTE_PERMISSION,
  REVIEWABLE_REQUESTS_RESOURCE,
  TOKEN_FACTORY_RESOURCE,
  TOKEN_REGISTRY_DEP,
  TOKEN_FACTORY_DEP,
  DefaultTERC20Params,
  DefaultTERC721Params,
} from "../utils/constants";

import {
  MasterContractsRegistry,
  MasterAccessManagement,
  ReviewableRequests,
  TokenRegistry,
  TokenFactory,
  TERC20,
  IRBAC,
  TERC20__factory,
  TERC721__factory,
  TERC721,
} from "@ethers-v6";

describe("TokenFactory", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;

  const ReviewableRequestsRole = "RR";
  const TokenFactoryRole = "TF";

  const ReviewableRequestsCreate: IRBAC.ResourceWithPermissionsStruct = {
    resource: REVIEWABLE_REQUESTS_RESOURCE,
    permissions: [CREATE_PERMISSION],
  };
  const TokenFactoryCreate: IRBAC.ResourceWithPermissionsStruct = {
    resource: TOKEN_FACTORY_RESOURCE,
    permissions: [CREATE_PERMISSION],
  };
  const TokenFactoryExecute: IRBAC.ResourceWithPermissionsStruct = {
    resource: TOKEN_FACTORY_RESOURCE,
    permissions: [EXECUTE_PERMISSION],
  };

  const description = "example.com";

  let registry: MasterContractsRegistry;
  let masterAccess: MasterAccessManagement;
  let reviewableRequests: ReviewableRequests;
  let tokenFactory: TokenFactory;
  let tokenRegistry: TokenRegistry;
  let TERC20Factory: TERC20__factory;
  let TERC721Factory: TERC721__factory;

  before("setup", async () => {
    [OWNER, USER1] = await ethers.getSigners();

    const MasterContractsRegistry = await ethers.getContractFactory("MasterContractsRegistry");
    registry = await MasterContractsRegistry.deploy();

    const MasterAccessManagement = await ethers.getContractFactory("MasterAccessManagement");
    const _masterAccess = await MasterAccessManagement.deploy();

    const ReviewableRequests = await ethers.getContractFactory("ReviewableRequests");
    const _reviewableRequests = await ReviewableRequests.deploy();

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const _tokenRegistry = await TokenRegistry.deploy();

    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const _tokenFactory = await TokenFactory.deploy();

    TERC20Factory = await ethers.getContractFactory("TERC20");
    const _erc20 = await TERC20Factory.deploy();

    TERC721Factory = await ethers.getContractFactory("TERC721");
    const _erc721 = await TERC721Factory.deploy();

    await registry.__MasterContractsRegistry_init(await _masterAccess.getAddress());

    masterAccess = MasterAccessManagement.attach(await registry.getMasterAccessManagement()) as MasterAccessManagement;
    await masterAccess.__MasterAccessManagement_init(OWNER);

    await registry.addProxyContract(await registry.REVIEWABLE_REQUESTS_NAME(), await _reviewableRequests.getAddress());
    await registry.addProxyContract(TOKEN_REGISTRY_DEP, await _tokenRegistry.getAddress());
    await registry.addProxyContract(TOKEN_FACTORY_DEP, await _tokenFactory.getAddress());

    reviewableRequests = ReviewableRequests.attach(await registry.getReviewableRequests()) as ReviewableRequests;
    tokenRegistry = TokenRegistry.attach(await registry.getContract(TOKEN_REGISTRY_DEP)) as TokenRegistry;
    tokenFactory = TokenFactory.attach(await registry.getContract(TOKEN_FACTORY_DEP)) as TokenFactory;

    await registry.injectDependencies(await registry.REVIEWABLE_REQUESTS_NAME());
    await registry.injectDependencies(TOKEN_REGISTRY_DEP);
    await registry.injectDependencies(TOKEN_FACTORY_DEP);

    await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryExecute], true);
    await masterAccess.grantRoles(await reviewableRequests.getAddress(), [TokenFactoryRole]);

    await masterAccess.addPermissionsToRole(ReviewableRequestsRole, [ReviewableRequestsCreate], true);
    await masterAccess.grantRoles(await tokenFactory.getAddress(), [ReviewableRequestsRole]);

    await tokenRegistry.setNewImplementations(
      [await tokenRegistry.TERC20_NAME(), await tokenRegistry.TERC721_NAME()],
      [await _erc20.getAddress(), await _erc721.getAddress()],
    );

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("only injector should set dependencies", async () => {
      await expect(tokenFactory.setDependencies(await registry.getAddress(), "0x")).to.be.rejectedWith(
        "Dependant: not an injector",
      );
    });
  });

  describe("TERC20", async () => {
    describe("requestTERC20", () => {
      it("should request TERC20 deployment", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description);

        const request = await reviewableRequests.requests(0);

        expect(request.creator).to.be.equal(await tokenFactory.getAddress());
        expect(request.executor).to.be.equal(await tokenFactory.getAddress());
        expect(request.misc).to.be.equal("TERC20");
      });

      it("should not request TERC20 without permissions", async () => {
        await expect(tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description)).to.be.rejectedWith(
          "TokenFactory: access denied",
        );
      });
    });

    describe("deployTERC20", () => {
      it("should deploy TERC20", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description);

        await reviewableRequests.acceptRequest(0);

        const token = TERC20Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC20_NAME(), 0, 1))[0],
        ) as TERC20;

        expect(await token.decimals()).to.be.equal(BigInt(18));
        expect(await token.contractURI()).to.be.equal("URI");
        expect(await token.TERC20_RESOURCE()).to.be.equal(`TERC20:${(await token.getAddress()).toLowerCase()}`);

        await expect(token.connect(USER1).mintTo(OWNER, 1)).to.be.rejectedWith("TERC20: access denied");
      });

      it("should deploy 2 TERC20", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description);
        await tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description);

        await reviewableRequests.acceptRequest(0);
        await reviewableRequests.acceptRequest(1);

        const token1 = TERC20Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC20_NAME(), 0, 1))[0],
        ) as TERC20;
        const token2 = TERC20Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC20_NAME(), 1, 1))[0],
        ) as TERC20;

        expect(await token1.TERC20_RESOURCE()).to.be.equal(`TERC20:${(await token1.getAddress()).toLowerCase()}`);
        expect(await token2.TERC20_RESOURCE()).to.be.equal(`TERC20:${(await token2.getAddress()).toLowerCase()}`);
      });

      it("should not deploy TERC20", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC20(DefaultTERC20Params, description);

        await expect(reviewableRequests.rejectRequest(0, "reason")).to.be.eventually.fulfilled;
      });

      it("should not deploy TERC20 due to permissions", async () => {
        await expect(tokenFactory.connect(USER1).deployTERC20(DefaultTERC20Params)).to.be.rejectedWith(
          "TokenFactory: access denied",
        );
      });
    });
  });

  describe("TERC721", () => {
    describe("requestTERC721", () => {
      it("should request TERC721 deployment", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description);

        const request = await reviewableRequests.requests(0);

        expect(request.creator).to.be.equal(await tokenFactory.getAddress());
        expect(request.executor).to.be.equal(await tokenFactory.getAddress());
        expect(request.misc).to.be.equal("TERC721");
      });

      it("should not request TERC721 without permissions", async () => {
        await expect(tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description)).to.be.rejectedWith(
          "TokenFactory: access denied",
        );
      });
    });

    describe("deployTERC721", () => {
      it("should deploy TERC721", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description);

        await reviewableRequests.acceptRequest(0);

        const token = TERC721Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC721_NAME(), 0, 1))[0],
        ) as TERC721;

        expect(await token.contractURI()).to.be.equal("URI");
        expect(await token.baseURI()).to.be.equal("BASE_URI");
        expect(await token.TERC721_RESOURCE()).to.be.equal(`TERC721:${(await token.getAddress()).toLowerCase()}`);

        await expect(token.connect(USER1).mintTo(OWNER, 1, "1")).to.be.rejectedWith("TERC721: access denied");
      });

      it("should deploy 2 TERC721", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description);
        await tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description);

        await reviewableRequests.acceptRequest(0);
        await reviewableRequests.acceptRequest(1);

        const token1 = TERC721Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC721_NAME(), 0, 1))[0],
        ) as TERC721;
        const token2 = TERC721Factory.attach(
          (await tokenRegistry.listPools(await tokenRegistry.TERC721_NAME(), 1, 1))[0],
        ) as TERC721;

        expect(await token1.TERC721_RESOURCE()).to.be.equal(`TERC721:${(await token1.getAddress()).toLowerCase()}`);
        expect(await token2.TERC721_RESOURCE()).to.be.equal(`TERC721:${(await token2.getAddress()).toLowerCase()}`);
      });

      it("should not deploy TERC721", async () => {
        await masterAccess.addPermissionsToRole(TokenFactoryRole, [TokenFactoryCreate], true);
        await masterAccess.grantRoles(USER1, [TokenFactoryRole]);

        await tokenFactory.connect(USER1).requestTERC721(DefaultTERC721Params, description);

        await expect(reviewableRequests.rejectRequest(0, "reason")).to.be.eventually.fulfilled;
      });

      it("should not deploy TERC721 due to permissions", async () => {
        await expect(tokenFactory.connect(USER1).deployTERC721(DefaultTERC721Params)).to.be.rejectedWith(
          "TokenFactory: access denied",
        );
      });
    });
  });
});
