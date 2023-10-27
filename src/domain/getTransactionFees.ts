import { provider } from "./contracts";

export const getTransactionFees = async ():Promise<any> => { 
  const blockData: any = await provider.getBlock("latest")
  console.log("maxPriorityFeePerGas to use", blockData["baseFeePerGas"].toNumber())
  console.log("maxFeePerGas to use", blockData["baseFeePerGas"].mul(10).div(4).toNumber() )
 
  const maxPriorityFeePerGasToUse = blockData["baseFeePerGas"].toNumber()
  const maxFeePerGasToUse = blockData["baseFeePerGas"].mul(10).div(4).toNumber()
  return {
    maxPriorityFeePerGasToUse,
    maxFeePerGasToUse
  }
}