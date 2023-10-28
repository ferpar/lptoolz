import { Token } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";

export const getPoolAddress = async (
  tokenIn: Token,
  tokenOut: Token,
  fee: number
) => {
  const [token0, token1] = tokenIn.sortsBefore(tokenOut)
    ? [tokenIn, tokenOut]
    : [tokenOut, tokenIn];

  const poolAddress = Pool.getAddress(token0, token1, fee);

  return poolAddress;
};
