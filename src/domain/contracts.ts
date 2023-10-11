import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export const provider = new ethers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);

// pool for uscd/eth at 0.05% fee tier
const UniV3PoolAddress = process.env.POOL_ADDRESS || "";
const uniswapV3PoolAbi = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

// non fungible position manager
const nonFungiblePositionManagerAddress = process.env.POSITION_MANAGER_ADDRESS || "";
const nonFungiblePositionManagerAbi = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json");

// get contract for erc20
export const erc20Abi = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json");

export const uniswapV3PoolContract = new ethers.Contract(
  UniV3PoolAddress,
  uniswapV3PoolAbi.abi,
  provider
);

export const nonFungiblePositionManagerContract = new ethers.Contract(
  nonFungiblePositionManagerAddress,
  nonFungiblePositionManagerAbi.abi,
  provider
) as any;