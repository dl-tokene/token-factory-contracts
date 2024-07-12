import { Deployer } from "@solarity/hardhat-migrate";

import { MasterContractsRegistry__factory, MasterAccessManagement__factory, IRBAC } from "@ethers-v6";

import {
  REVIEWABLE_REQUESTS_CREATOR,
  TOKEN_FACTORY_EXECUTOR,
  REVIEWABLE_REQUESTS_RESOURCE,
  TOKEN_FACTORY_RESOURCE,
  CREATE_PERMISSION,
  EXECUTE_PERMISSION,
  TOKEN_FACTORY_DEP,
} from "./utils/constants";
import { getConfigJson } from "./config/config-getter";

export = async (deployer: Deployer) => {
  const config = await getConfigJson();

  const registry = await deployer.deployed(MasterContractsRegistry__factory, config.addresses.MasterContractsRegistry);

  const masterAccess = await deployer.deployed(
    MasterAccessManagement__factory,
    await registry.getMasterAccessManagement(),
  );

  const reviewableRequestsAddress = await registry.getReviewableRequests();
  const tokenFactoryAddress = await registry.getContract(TOKEN_FACTORY_DEP);

  const TokenFactoryExecute: IRBAC.ResourceWithPermissionsStruct = {
    resource: TOKEN_FACTORY_RESOURCE,
    permissions: [EXECUTE_PERMISSION],
  };
  const ReviewableRequestsCreate: IRBAC.ResourceWithPermissionsStruct = {
    resource: REVIEWABLE_REQUESTS_RESOURCE,
    permissions: [CREATE_PERMISSION],
  };

  await masterAccess.addPermissionsToRole(TOKEN_FACTORY_EXECUTOR, [TokenFactoryExecute], true);

  await masterAccess.addPermissionsToRole(REVIEWABLE_REQUESTS_CREATOR, [ReviewableRequestsCreate], true);

  await masterAccess.grantRoles(reviewableRequestsAddress, [TOKEN_FACTORY_EXECUTOR]);

  await masterAccess.grantRoles(tokenFactoryAddress, [REVIEWABLE_REQUESTS_CREATOR]);
};
