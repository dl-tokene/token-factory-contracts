# Token factory contract for TokenE

This repository represents the token factory module smart contracts part of the operating system.

## What 

This is a token factory module to enable deployment of `TERC20` and `TERC721` tokens on TokenE. The module integrates with the TokenE core through NPM. The module provides special reviewable requests that deploy tokens if accepted and uses `MasterAccessManagement` contract to control access. 

It consists of 4 main contract:

1. `TokenFactory`
2. `TokenRegistry`
3. `TERC20`
4. `TERC721`

The `TokenFactory` and `TokenRegistry` work in pair as a beacon proxy factory & registry. More about this pattern can be found [here](https://github.com/dl-solidity-library/dev-modules/tree/master/contracts/contracts-registry/pools).

The `TERC20` token is a custom `ERC20` token with permissioned access to mint, burn, receive, and spend tokens.

The `TERC721` token is a custom `ERC721` token with permissioned access to mint, burn, receive, and spend tokens, which also comes with extended token URI capabilities.

## Integration

This module is currently not supposed to be integrated with.

## License 

The TokenE core is released under the custom License. Please take a look to understand the limitations.
