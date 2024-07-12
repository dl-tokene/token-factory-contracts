import { expect } from "chai";
import { ethers } from "hardhat";

import { Reverter } from "@/test/helpers/reverter";

import { ContractMetadataMock } from "@ethers-v6";

describe("ContractMetadata", () => {
  const reverter = new Reverter();

  let contractMetadata: ContractMetadataMock;

  before("setup", async () => {
    const ContractMetadata = await ethers.getContractFactory("ContractMetadataMock");
    contractMetadata = await ContractMetadata.deploy();

    await reverter.snapshot();
  });

  afterEach("revert", reverter.revert);

  describe("access", () => {
    it("should not initialize", async () => {
      await expect(contractMetadata.init("")).to.be.rejectedWith("Initializable: contract is not initializing");
    });
  });

  describe("setContractMetadata", () => {
    it("should set contract metadata", async () => {
      await contractMetadata.setContractMetadata("METADATA");

      expect(await contractMetadata.contractURI()).to.be.equal("METADATA");
    });
  });
});
