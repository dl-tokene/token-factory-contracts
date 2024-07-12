import { Deployer } from "@solarity/hardhat-migrate";

import { MasterContractsRegistry__factory } from "@ethers-v6";

import { getConfigJson } from "./config/config-getter";
import { TOKEN_FACTORY_DEP, TOKEN_REGISTRY_DEP } from "./utils/constants";

export = async (deployer: Deployer) => {
  const config = await getConfigJson();

  const registry = await deployer.deployed(MasterContractsRegistry__factory, config.addresses.MasterContractsRegistry);

  await registry.injectDependencies(TOKEN_FACTORY_DEP);
  await registry.injectDependencies(TOKEN_REGISTRY_DEP);
};
