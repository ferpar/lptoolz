import dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import { getFeeData } from "./gasPrice";
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


  const blockData: any = await provider.getBlock("latest")
  console.log("blockData")
  console.log({
    baseFeePerGas: blockData.baseFeePerGas.toNumber(),
    gasLimit: blockData.gasLimit.toNumber(),
    gasUsed: blockData.gasUsed.toNumber(),
  })
  console.log("maxPriorityFeePerGas to use", blockData["baseFeePerGas"].toNumber())
  console.log("maxFeePerGas to use", blockData["baseFeePerGas"].mul(10).div(4).toNumber() )
 
  const maxPriorityFeePerGasToUse = blockData["baseFeePerGas"].toNumber()
  const maxFeePerGasToUse = blockData["baseFeePerGas"].mul(10).div(4).toNumber()

  const gasEstimate = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .estimateGas
    .decreaseLiquidity(params, {
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
      maxFeePerGas: maxFeePerGasToUse
    });

    console.log("decreaseLiquidity gasEstimate")
    console.log(gasEstimate.toString())

  const tx = await nonFungiblePositionManagerContract
    .connect(connectedWallet)
    .decreaseLiquidity(params, 
      {
      gasLimit: gasEstimate.mul(3),
      maxPriorityFeePerGas: maxPriorityFeePerGasToUse,
      maxFeePerGas: maxFeePerGasToUse
    }
    );
  await tx.wait();

  return tx;
};
