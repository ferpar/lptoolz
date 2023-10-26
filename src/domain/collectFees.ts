import dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import { getFeeData } from "./gasPrice";
import { provider, nonFungiblePositionManagerContract } from "./contracts";

export const collectFees = async (positionId: number): Promise<any> => {
  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const blockData: any = await provider.getBlock("latest")
  const maxPriorityFeePerGasToUse = blockData["baseFeePerGas"].toNumber()
  const maxFeePerGasToUse = blockData["baseFeePerGas"].mul(10).div(4).toNumber()

  const gasEstimate = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .estimateGas
    .collect({
      tokenId: positionId,
      recipient: connectedWallet.address,
      amount0Max: BigInt(99999999999999999999999),
      amount1Max: BigInt(99999999999999999999999),
    });

    console.log("collectFees gasEstimate")
    console.log(gasEstimate.toString())

  const tx = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .collect({
      tokenId: positionId,
      recipient: connectedWallet.address,
      amount0Max: BigInt(99999999999999999999999),
      amount1Max: BigInt(99999999999999999999999),
    }, 
    {
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
      maxFeePerGas: maxFeePerGasToUse,
      gasLimit: gasEstimate.mul(2),
    }
    );
  await tx.wait();

  return tx
  
};
