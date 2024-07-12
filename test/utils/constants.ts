export const CREATE_PERMISSION = "CREATE";
export const EXECUTE_PERMISSION = "EXECUTE";
export const MINT_PERMISSION = "MINT";
export const BURN_PERMISSION = "BURN";
export const SPEND_PERMISSION = "SPEND";
export const RECEIVE_PERMISSION = "RECEIVE";
export const CHANGE_METADATA_PERMISSION = "CHANGE_METADATA";

export const REVIEWABLE_REQUESTS_RESOURCE = "REVIEWABLE_REQUESTS_RESOURCE";
export const TOKEN_REGISTRY_RESOURCE = "TOKEN_REGISTRY_RESOURCE";
export const TOKEN_FACTORY_RESOURCE = "TOKEN_FACTORY_RESOURCE";

export const TOKEN_REGISTRY_DEP = "TOKEN_REGISTRY";
export const TOKEN_FACTORY_DEP = "TOKEN_FACTORY";

export const DefaultTERC20Params = {
  name: "name",
  symbol: "symbol",
  contractURI: "URI",
  decimals: 18,
  totalSupplyCap: 0,
};

export const DefaultTERC721Params = {
  name: "name",
  symbol: "symbol",
  contractURI: "URI",
  baseURI: "BASE_URI",
  totalSupplyCap: 0,
};
