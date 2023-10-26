import dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import { TransactionState } from "../sdk/libs/providers";
import { getGasPriceInWei } from "./gasPrice";
import { provider, nonFungiblePositionManagerContract } from "./contracts";

export const decreaseLiquidity = async (
  positionId: number,
  all: boolean = false
): Promise<any> => {
  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const positionInfo = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .positions(positionId);

  const liquidity = BigInt(positionInfo.liquidity.toString());
  const halfLiquidity = liquidity / 2n;

  const params = {
    // id of the position in the pool
    tokenId: positionId,
    liquidity: all ? liquidity : halfLiquidity,
    amount0Min: 0,
    amount1Min: 0,
    // now in seconds + 10 minutes in seconds
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
  };

  const gasPrice = await getGasPriceInWei();
  if (!gasPrice) {
    return TransactionState.Failed;
  }
  const gasPriceToUse = (BigInt(gasPrice.toString()) * BigInt(15)) / BigInt(10);
  const maxPriorityFeePerGasToUse =
    (BigInt(gasPrice.toString()) * BigInt(5)) / BigInt(10);

  const tx = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .decreaseLiquidity(params, {
      gasLimit: 1000000 * 30,
      gasPrice: gasPriceToUse.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse.toString(),
    });

  return await tx.wait();
};
