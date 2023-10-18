import Big from "big.js";
import {
  getPoolPrice,
  getPositionTicks,
  getDecimals,
  tickToPrice,
  getInvertedPrice,
} from "./PriceOracle";

import { decreaseLiquidity } from "../domain/decreaseLiquidity";
import { collectFees } from "../domain/collectFees";

import { getGasPrice } from "../domain/gasPrice";
import { executeSwap } from "../sdk/libs/routing";

const poolStopLoss = async (
  fractionToBottom: number,
  positionTicks: { tickLower: string; tickUpper: string },
  decimals: number[],
  verbose: boolean = false
) => {
  // get current price
  const priceInToken1 = await getPoolPrice();
  const price = Big(await getInvertedPrice(priceInToken1));
  // get lower and upper price in token0 (token0 as quote currency)
  const lowerPrice = await tickToPrice(positionTicks.tickLower);
  const upperPrice = await tickToPrice(positionTicks.tickUpper);
  // as we invert prices we need to invert lower and upper price since they are in token0/token1
  const token1PriceLower = await getInvertedPrice(upperPrice);
  const token1PriceUpper = await getInvertedPrice(lowerPrice);
  // calculate stop loss price as fraction of interval between lower and upper price
  const fromUpperToLower = token1PriceUpper.minus(token1PriceLower);
  const stopLossPrice = token1PriceUpper.minus(fromUpperToLower.mul(fractionToBottom))

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

  // return true if current price is below stop loss price
  return price.lt(stopLossPrice);
};

export default class PoolStopLoss {
  decimals: number[] = [];
  positionTicks: { tickLower: string; tickUpper: string } = {
    tickLower: "",
    tickUpper: "",
  };
  exited: boolean = false;
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
  // WIP method - need to get token reserves and calculate how much to withdraw
  public async checkAndExit() {
    const belowStopLossPrice = await this.check();
    if (belowStopLossPrice && !this.exited) {
      console.log("below stop loss price, exiting");
      console.log("calling decreaseLiquidity for positionId", this.positionId)
      const receipt = await decreaseLiquidity(this.positionId, true);  // true means 100% of liquidity
      const feesReceipt = await collectFees(this.positionId);
      console.log("decreaseLiquidity tx ", receipt)
      console.log("collectFees tx ", feesReceipt)

      console.log('calling executeSwap')
      const swapReceipt = await executeSwap();
      console.log('executeSwap tx', swapReceipt)

      this.exited = true;
    }
  }
}
