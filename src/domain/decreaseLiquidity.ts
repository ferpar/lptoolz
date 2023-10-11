import dotenv from "dotenv";
dotenv.config();
import { Wallet, ethers } from "ethers";
import { provider, nonFungiblePositionManagerContract } from "./contracts";

export const getGasPrice = async (): Promise<number> => {
  const gasPrice = await provider.getFeeData();
  return Number(gasPrice.toString());
}

export const decreaseLiquidity = async (positionId: number): Promise<any> => {
  const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
  const connectedWallet = wallet.connect(provider);

  const positionInfo = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .positions(positionId)
    
  const liquidity = BigInt(positionInfo.liquidity.toString());
  const halfLiquidity = (liquidity / 2n);

  const params = {
    // id of the position in the pool
    tokenId: positionId,
    liquidity: halfLiquidity,
    amount0Min: 0,
    amount1Min: 0,
    // now in seconds + 10 minutes in seconds
    deadline: Math.floor(Date.now() / 1000) + (60 * 10),
  }

  const decreaseReceipt = await nonFungiblePositionManagerContract.connect(connectedWallet)
  .decreaseLiquidity(
    params,
    {gasLimit: 1000000}
  )

  return decreaseReceipt;
};
