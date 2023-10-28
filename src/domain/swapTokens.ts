import dotenv from "dotenv";
dotenv.config();
import { Wallet, BigNumber } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { ChainId } from "@uniswap/sdk-core";
import {
  provider,
  selectedNetwork,
  swapRouterContract,
  getTokenContract,
  getPoolContract,
} from "./contracts";
import { getPoolAddress } from "./getPoolAddress";
import { getTransactionFees } from "./getTransactionFees";

export const swapTokens = async (
  tokenInAddress: string,
  tokenOutAddress: string,
  fee: number,
  amountIn: number
): Promise<any> => {
  console.log("swapTokens start");
  const network =
    selectedNetwork === "ETH-MAINNET" ? ChainId.MAINNET : ChainId.POLYGON;

  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const tokenInContract = getTokenContract(tokenInAddress);
  const tokenOutContract = getTokenContract(tokenOutAddress);

  const tokenInDecimals = await tokenInContract.decimals();
  const tokenOutDecimals = await tokenOutContract.decimals();
  const tokenInSymbol = await tokenInContract.symbol();
  const tokenOutSymbol = await tokenOutContract.symbol();
  const tokenInName = await tokenInContract.name();
  const tokenOutName = await tokenOutContract.name();

  console.log("got token info");

  const TokenIn = new Token(
    network,
    tokenInAddress,
    tokenInDecimals,
    tokenInSymbol,
    tokenInName
  );

  const TokenOut = new Token(
    network,
    tokenOutAddress,
    tokenOutDecimals,
    tokenOutSymbol,
    tokenOutName
  );

  console.log("before getPoolAddress");
  const poolAddress = await getPoolAddress(TokenIn.address, TokenOut.address, fee);

  console.log("getting pool contract")
  const poolContract = await getPoolContract(poolAddress);
  const { sqrtPriceX96, tick } = await poolContract.slot0();

  const amountInFormatted = BigNumber.from(amountIn.toString()).mul(
    BigNumber.from(10).pow(tokenInDecimals)
  );

  console.log("before getTransactionFees");
  const { maxPriorityFeePerGasToUse, maxFeePerGasToUse } =
    await getTransactionFees();

  const options = {
    gasLimit: BigNumber.from("300000"),
    maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
    maxFeePerGas: maxFeePerGasToUse,
  };

  console.log("before approve");
  // get permission to spend tokens
  const approveTx = await tokenInContract
    .connect(connectedWallet)
    .approve(swapRouterContract.address, amountInFormatted, options);

  await approveTx.wait();

  // get data for the swap
  const params = {
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    fee: fee,
    recipient: connectedWallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn: amountInFormatted,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };


  console.log("before Swap");
  // swap
  const tx = await swapRouterContract
    .connect(connectedWallet)
    .exactInputSingle(params, options);

  const receipt = await tx.wait();

  return receipt;
};
