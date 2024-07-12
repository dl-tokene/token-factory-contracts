import { Deployer } from "@solarity/hardhat-migrate";

import { MasterContractsRegistry__factory, TokenRegistry__factory } from "@ethers-v6";

import { TOKEN_REGISTRY_DEP } from "./utils/constants";
import { getConfigJson } from "./config/config-getter";

export = async (deployer: Deployer) => {
  const config = await getConfigJson();

  const registry = await deployer.deployed(MasterContractsRegistry__factory, config.addresses.MasterContractsRegistry);

  const tokenRegistry = await deployer.deploy(TokenRegistry__factory);

  await registry.addProxyContract(TOKEN_REGISTRY_DEP, await tokenRegistry.getAddress());
};
