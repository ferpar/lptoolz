
import dotenv from "dotenv";
dotenv.config();
import { Wallet, ethers } from "ethers";
import { provider, nonFungiblePositionManagerContract } from "./contracts";

export const collectFees = async (positionId: number): Promise<any> => {
    const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);
    const connectedWallet = wallet.connect(provider);

    
}