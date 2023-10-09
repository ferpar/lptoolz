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
  // get lower and upper price in token0 (token0 as quote currency)
  const lowerPrice = tickToPrice(positionTicks.tickLower);
  const upperPrice = tickToPrice(positionTicks.tickUpper);
  // as we invert prices we need to invert lower and upper price since they are in token0/token1
  const token1PriceLower = await getInvertedPrice(Big(upperPrice), decimals);
  const token1PriceUpper = await getInvertedPrice(Big(lowerPrice), decimals);
  // calculate stop loss price as fraction of interval between lower and upper price
  const fromUpperToLower = token1PriceUpper.minus(token1PriceLower);
  const stopLossPrice = token1PriceUpper.minus(fromUpperToLower.mul(fractionToBottom))

  // return true if current price is below stop loss price
  if (verbose) {
    console.log(`Current price: ${price}`);
    console.log(`Lower price: ${token1PriceLower}`);
    console.log(`Upper price: ${token1PriceUpper}`)
    console.log(`From upper to lower: ${fromUpperToLower}`)
    console.log(`Fraction to bottom: ${fractionToBottom}`)
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
    const {tickLower, tickUpper} = await getPositionTicks(this.positionId);
    this.positionTicks = {tickLower, tickUpper};
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
