import dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import { TransactionState } from "../sdk/libs/providers";
import { getGasPriceInWei } from "./gasPrice";
import { provider, nonFungiblePositionManagerContract } from "./contracts";

export const collectFees = async (positionId: number): Promise<any> => {
  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const gasPrice = await getGasPriceInWei();
  if (!gasPrice) {
    return TransactionState.Failed;
  }
  const gasPriceToUse = (BigInt(gasPrice.toString()) * BigInt(15)) / BigInt(10);
  const maxPriorityFeePerGasToUse =
    (BigInt(gasPrice.toString()) * BigInt(5)) / BigInt(10);

  const tx = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .collect({
      tokenId: positionId,
      recipient: connectedWallet.address,
      amount0Max: BigInt(99999999999999999999999),
      amount1Max: BigInt(99999999999999999999999),
      gasPrice: gasPriceToUse.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse.toString(),
    });

  return await tx.wait();
};
