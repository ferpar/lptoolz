import dotenv from "dotenv";
dotenv.config();
import { Wallet, BigNumber } from "ethers";
import { getTransactionFees } from "./getTransactionFees";
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

  const {
    maxPriorityFeePerGasToUse,
    maxFeePerGasToUse
  } = await getTransactionFees();

  // const gasEstimate = await nonFungiblePositionManagerContract
  //   .connect(connectedWallet)
  //   .estimateGas
  //   .decreaseLiquidity(params, {
  //     maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
  //     maxFeePerGas: maxFeePerGasToUse
  //   });

  //   console.log("decreaseLiquidity gasEstimate")
  //   console.log(gasEstimate.toString())

  const tx = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .decreaseLiquidity(params, 
      {
      gasLimit: BigNumber.from("600000"),
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
      maxFeePerGas: maxFeePerGasToUse
    }
    );
  await tx.wait();

  return tx;
};
