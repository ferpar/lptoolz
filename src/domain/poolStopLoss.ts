import Big from "big.js";
import {
  getPoolPrice,
  getPositionTicks,
  getDecimals,
  tickToPrice,
  getInvertedPrice,
} from "./PriceOracle";

const poolStopLoss = async (
  fractionToBottom: number,
  positionTicks: { tickLower: string; tickUpper: string },
  decimals: number[],
  verbose: boolean = false
) => {
  // get current price
  const rawPrice = await getPoolPrice();
  const price = Big(await getInvertedPrice(rawPrice, decimals));
  // get lower and upper price
  const { tickLower, tickUpper } = positionTicks;
  const lowerPrice = tickToPrice(tickLower);
  const upperPrice = tickToPrice(tickUpper);
  const token1PriceLower = await getInvertedPrice(Big(lowerPrice), decimals);
  const token1PriceUpper = await getInvertedPrice(Big(upperPrice), decimals);
  // calculate stop loss price as fraction of interval between lower and upper price
  const stopLossPrice = token1PriceLower
    .minus(token1PriceUpper)
    .mul(fractionToBottom)
    .plus(token1PriceUpper);
  // return true if current price is below stop loss price
  if (verbose) {
    console.log(`Current price: ${price}`);
    console.log(`Lower price: ${token1PriceLower}`);
    console.log(`Stop loss price: ${stopLossPrice}`);
    console.log(
      `Current price is below stop loss price: ${price.lt(stopLossPrice)}`
    );
  }
  return price.lt(stopLossPrice);
};

export default class PoolStopLoss {
  decimals: number[] = [];
  positionTicks: { tickLower: string; tickUpper: string } = {
    tickLower: "",
    tickUpper: "",
  };
  constructor(public fractionToBottom: number, public positionId: number) {
    this.fractionToBottom = fractionToBottom;
    this.positionId = positionId;
  }
  public async init(): Promise<void> {
    console.log("initializing pool stop loss");
    this.decimals = await getDecimals();
    this.positionTicks = await getPositionTicks(this.positionId);
  }
  public async check(verbose: boolean = false) {
    return await poolStopLoss(
      this.fractionToBottom,
      this.positionTicks,
      this.decimals,
      verbose
    );
  }
}
