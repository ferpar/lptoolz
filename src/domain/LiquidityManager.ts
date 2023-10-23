import { IPositionTracker } from "./PositionTracker";
import { decreaseLiquidity } from "./decreaseLiquidity";
import { collectFees } from "./collectFees";
export interface ILiquidityManager {
  withdraw(proportion?: number): Promise<void>;
  withdrawAndSwapToStablecoin(proportion?: number): Promise<void>;
  stopLoss(fractionToBottom: number, options: { test: boolean }): Promise<void>;
}

export default class LiquidityManager implements ILiquidityManager {
  tracker: IPositionTracker;
  // this is to prevent multiple calls to withdraw
  exited: boolean = false;
  constructor(tracker: IPositionTracker) {
    this.tracker = tracker;
  }

  public async withdraw(): Promise<void> {
    if (this.exited) return;
    this.exited = true;
    const positionId = this.tracker.position.positionId;
    console.log("calling decreaseLiquidity for positionId", positionId);
    const receipt = await decreaseLiquidity(positionId, true); // true means 100% of liquidity
    const feesReceipt = await collectFees(positionId);
    console.log("decreaseLiquidity tx ", receipt);
    console.log("collectFees tx ", feesReceipt);
  }

  public async withdrawAndSwapToStablecoin(): Promise<void> {
    if (this.exited) return;
    this.exited = true;
  }

  public async stopLoss(
    fractionToBottom: number = 0.6,
    options: { test: boolean } = { test: false }
  ): Promise<void> {
        await this.tracker.updateBalances();
        const price = this.tracker.pool.price;
        const upperPrice = this.tracker.position.priceUpperBound;
        const lowerPrice = this.tracker.position.priceLowerBound;
        const priceDifference = upperPrice.sub(lowerPrice);
        const stopLossPrice = upperPrice.sub(priceDifference.times(fractionToBottom));
        const belowStopLossPrice = price.lt(stopLossPrice);
        const token0Balance = this.tracker.position.token0Balance;
        const token1Balance = this.tracker.position.token1Balance;
    if (options.test) {
        console.log("Current price: ", price.toString());
        console.log("Upper price: ", upperPrice.toString());
        console.log("Stop loss price: ", stopLossPrice.toString());
        console.log("Bottom price: ", lowerPrice.toString());
        console.log("Current price is below stop loss price: ", belowStopLossPrice);
        console.log("token0 balance: ", token0Balance.toString());
        console.log("token1 balance: ", token1Balance.toString());
        return
    }
    if (belowStopLossPrice) {
        console.log("below stop loss price, exiting");
        // TODO: replace with withdrawAndSwapToStablecoin
        await this.withdraw();
    }
  }
}
