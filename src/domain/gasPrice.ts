import { ethers, BigNumber } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export const provider = new ethers.providers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);

export const getGasPriceInWei = async ():Promise<BigNumber> => {
  const gasPriceRaw = await provider.getGasPrice();
  return gasPriceRaw;
}
