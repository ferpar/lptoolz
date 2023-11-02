import dotenv from "dotenv";
dotenv.config();
import { IPositionTracker } from "./PositionTracker";
import { decreaseLiquidity } from "./decreaseLiquidity";
import { collectFees } from "./collectFees";
import { swapTokens } from "./swapTokens";
export interface ILiquidityManager {
  withdraw(proportion?: number): Promise<void>;
  manage(
    fractionToBottom: number,
    options: { test: boolean; inverse: boolean }
  ): Promise<void>;
}

export default class LiquidityManager implements ILiquidityManager {
  tracker: IPositionTracker;
  // this is to prevent multiple calls to withdraw
  exited: boolean = false;
  constructor(tracker: IPositionTracker) {
    this.tracker = tracker;
  }

  public async withdraw(): Promise<void> {
    const positionId = this.tracker.position.positionId;
    console.log("calling decreaseLiquidity for positionId", positionId);
    const receipt = await decreaseLiquidity(positionId, true); // true means 100% of liquidity, false 50%
    const feesReceipt = await collectFees(positionId);
    console.log("decreaseLiquidity tx ", receipt);
    console.log("collectFees tx ", feesReceipt);
  }

  public async manage(
    fractionToBottom: number = 0.6,
    options: { test: boolean; inverse: boolean } = {
      test: false,
      inverse: false,
    }
  ): Promise<void> {

    // update tracker
    await this.tracker.updateBalances();

    // define basic prices
    const price = this.tracker.pool.price;
    const upperPrice = this.tracker.position.priceUpperBound;
    const lowerPrice = this.tracker.position.priceLowerBound;

    // derive stop loss price
    const priceDifference = upperPrice.sub(lowerPrice);
    const stopLossPrice = upperPrice.sub(
      priceDifference.times(fractionToBottom)
    );
    
    // check if current price is below stop loss price
    const belowStopLossPrice = price.lt(stopLossPrice);

    // get balances and symbols
    const token0Balance = this.tracker.position.token0Balance;
    const token1Balance = this.tracker.position.token1Balance;
    const token0Symbol = this.tracker.token0.symbol;
    const token1Symbol = this.tracker.token1.symbol;

    // log everything
    console.log("Current price: ", price.toString());
    console.log("Upper price: ", upperPrice.toString());
    console.log("Stop loss price: ", stopLossPrice.toString());
    console.log("Bottom price: ", lowerPrice.toString());
    console.log("Current price is below stop loss price: ", belowStopLossPrice);
    console.log("token0 balance: ", token0Balance.toString());
    console.log("token1 balance: ", token1Balance.toString());
    console.log("token0 symbol: ", token0Symbol);
    console.log("token1 symbol: ", token1Symbol);
    const swapExplanation = options.inverse
      ? `if below stop loss, swap ${token1Symbol} back to ${token0Symbol}`
      : `if below stop loss, swap ${token0Symbol} back to ${token1Symbol}`;
    console.log(swapExplanation);
    console.log("test mode: ", options.test);

    // if it is a test, exit without withdrawing / swapping
    if (options.test) {
      return;
    }

    if (belowStopLossPrice) {
      if (this.exited) return;
      this.exited = true;

      const tokenInAddress = options.inverse
        ? this.tracker.token1.address
        : this.tracker.token0.address;
      const tokenOutAddress = options.inverse
        ? this.tracker.token0.address
        : this.tracker.token1.address;

      const amountIn = options.inverse ? token1Balance : token0Balance;


      console.log("below stop loss price, exiting position");

      console.log("withdrawing liquidity");
      await this.withdraw();



      console.log("swapping to stablecoin");

      console.log("Arguments to swapTokens:");
      console.log({
        tokenInAddress: tokenInAddress,
        tokenOutAddress: tokenOutAddress,
        fee: Number(this.tracker.position.fee),
        amountIn: amountIn.toNumber(),
      });

      // handle case where amountIn is 0
      if (amountIn.eq(0)) {
        console.log("amountIn is 0, aborting swap before error");
        return
      }

      const swapReceipt = await swapTokens(
        tokenInAddress,
        tokenOutAddress,
        Number(this.tracker.position.fee),
        amountIn.toNumber()
      );

      console.log("swap transaction hash: ", swapReceipt.transactionHash);
    }
    return;
  }
}
