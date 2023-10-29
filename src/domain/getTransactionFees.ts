import { provider } from "./contracts";
import { getFeeData } from "./gasPrice";

export const getTransactionFees = async (): Promise<any> => {
  const blockData: any = await provider.getBlock("latest");
  const feeData = await getFeeData();

  const maxPriorityFeeMultiplier = 23

  const maxPriorityFeePerGasToUse = feeData.maxPriorityFeePerGas
    .mul(maxPriorityFeeMultiplier)
    .toNumber();
  const maxFeePerGasToUse = blockData["baseFeePerGas"]
    .mul(10)
    .div(4)
    .add(feeData.maxPriorityFeePerGas.mul(maxPriorityFeeMultiplier))
    .toNumber();

  console.log(
    "maxPriorityFeePerGas to use",
    maxPriorityFeePerGasToUse
  );
  console.log(
    "maxFeePerGas to use",
    maxFeePerGasToUse
  );
  return {
    maxPriorityFeePerGasToUse,
    maxFeePerGasToUse,
  };
};
