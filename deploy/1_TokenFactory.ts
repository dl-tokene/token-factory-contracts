import { Deployer } from "@solarity/hardhat-migrate";

import { MasterContractsRegistry__factory, TokenFactory__factory } from "@ethers-v6";

import { TOKEN_FACTORY_DEP } from "./utils/constants";
import { getConfigJson } from "./config/config-getter";

export = async (deployer: Deployer) => {
  const config = await getConfigJson();

  const registry = await deployer.deployed(MasterContractsRegistry__factory, config.addresses.MasterContractsRegistry);

  const tokenFactory = await deployer.deploy(TokenFactory__factory);

  await registry.addProxyContract(TOKEN_FACTORY_DEP, await tokenFactory.getAddress());
};
