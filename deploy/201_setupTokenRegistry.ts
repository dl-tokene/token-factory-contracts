import { Deployer } from "@solarity/hardhat-migrate";

import { MasterContractsRegistry__factory, TokenRegistry__factory, TERC20__factory } from "@ethers-v6";

import { TOKEN_REGISTRY_DEP } from "./utils/constants";
import { getConfigJson } from "./config/config-getter";

export = async (deployer: Deployer) => {
  const config = await getConfigJson();

  const registry = await deployer.deployed(MasterContractsRegistry__factory, config.addresses.MasterContractsRegistry);

  const tokenRegistry = await deployer.deployed(TokenRegistry__factory, await registry.getContract(TOKEN_REGISTRY_DEP));

  const terc20 = await deployer.deploy(TERC20__factory);

  await tokenRegistry.setNewImplementations([await tokenRegistry.TERC20_NAME()], [await terc20.getAddress()]);
};
