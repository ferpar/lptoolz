import dotenv from "dotenv";
dotenv.config();
import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { DAI_TOKEN, USDC_TOKEN, WETH_TOKEN } from './libs/constants'

// Sets if the example should run locally or on chain
export enum Environment {
  LOCAL,
  WALLET_EXTENSION,
  MAINNET,
}

// Inputs that configure this example to run
export interface ExampleConfig {
  env: Environment
  rpc: {
    local: string
    mainnet: string
  }
  wallet: {
    address: string
    privateKey: string
  }
  tokens: {
    token0: Token
    token0Amount: number
    token1: Token
    token1Amount: number
    poolFee: FeeAmount
    fractionToRemove: number
    fractionToAdd: number
    in: Token,
    amountIn: number,
    out: Token
  }
}

// Example Configuration

export const CurrentConfig: ExampleConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: process.env.LOCAL_RPC_URL || '',
    mainnet:
      process.env.NETWORK === "ETH-MAINNET" 
        ? process.env.ALCHEMY_HTTPS_URL || ''
        : process.env.ALCHEMY_POLYGON_HTTPS_URL || '',
  },
  wallet: {
    address: process.env.ADDRESS || '',
    privateKey: process.env.PRIVATE_KEY || '',
  },
  tokens: {
    token0: USDC_TOKEN,
    token0Amount: 1000,
    token1: DAI_TOKEN,
    token1Amount: 1000,
    poolFee: FeeAmount.LOW,
    fractionToRemove: 1,
    fractionToAdd: 0.5,
    // swap options:
    in: WETH_TOKEN,
    amountIn: 0.320,
    out: USDC_TOKEN
  },
}
