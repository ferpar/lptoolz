import dotenv from "dotenv";
dotenv.config();
import { Wallet, ethers } from "ethers";
import {
  provider,
  nonFungiblePositionManagerContract,
  getTokenContracts,
} from "./contracts";

export const collectFees = async (positionId: number): Promise<any> => {
  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const tx = await nonFungiblePositionManagerContract.connect(connectedWallet).collect({
    tokenId: positionId,
    recipient: connectedWallet.address,
    amount0Max: BigInt(99999999999999999999999),
    amount1Max: BigInt(99999999999999999999999),
  });

  return await tx.wait();
};
