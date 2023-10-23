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
        const stopLossPrice = upperPrice.times(fractionToBottom);
        const belowStopLossPrice = price.lt(stopLossPrice);
    if (options.test) {
        console.log("Current price: ", price.toString());
        console.log("Upper price: ", upperPrice.toString());
        console.log("Stop loss price: ", stopLossPrice.toString());
        console.log("Current price is below stop loss price: ", belowStopLossPrice);
        return
    }
    if (belowStopLossPrice) {
        console.log("below stop loss price, exiting");
        // TODO: replace with withdrawAndSwapToStablecoin
        // await this.withdraw();
    }
  }
}
