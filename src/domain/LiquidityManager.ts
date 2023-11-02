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
    options: { test: boolean; inverse: boolean; autoUSDCQuote: boolean }
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

  // check if tokens are the same in pool and position contracts
  checkTokens(): boolean {
    const poolToken0Address = this.tracker.pool.token0Address;
    const poolToken1Address = this.tracker.pool.token1Address;
    const positionToken0Address = this.tracker.position.token0Address;
    const positionToken1Address = this.tracker.position.token1Address;
    if (
      poolToken0Address !== positionToken0Address ||
      poolToken1Address !== positionToken1Address
    ) {
      throw new Error(
        "DIFFERENT TOKENS IN POOL AND POSITION CONTRACTS, PLEASE CHECK POOL ADDRESS AND POSITION ID"
      );
    }
    return true;
  }

  // check if token1Addess is USDC
  checkUSDCQuote(
    inverse: boolean,
    autoUSDCQuote: boolean | undefined
  ): boolean {
    const network = process.env.NETWORK;
    // DANGER: we assume if it is not polygon, it is ethereum
    // this needs to be updated if we add more networks
    const USDCAddress =
      network === "POLYGON"
        ? "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
        : "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const token1Address = this.tracker.position.token1Address;
    const token0Address = this.tracker.position.token0Address;
    // to lower case to avoid issues with checksum / capitals
    if (token1Address.toLowerCase() !== USDCAddress.toLowerCase()) {

      if (token0Address.toLowerCase() !== USDCAddress.toLowerCase()) {
        if (autoUSDCQuote){
        throw new Error("NO USDC IN POSITION, CHECK POSITION OR SET AUTOUSDCQUOTE TO FALSE");
        }
        return false;
      }

      if (!inverse && !autoUSDCQuote) {
        console.log("TOKEN1ADDRESS IS NOT USDC, SET INVERSE TO TRUE");
      }
      return false;
    }
    return true;
  }

  // fractionToBottom: fraction of the price range from topPrice to exitPrice
  // test: if true, will not withdraw or swap
  // inverse: if true, will use inverted price
  // autoUSDCQuote: if true, will check if token1 is USDC and set inverse to true if it is not
  public async manage(
    fractionToBottom: number = 0.6,
    options: { test: boolean; inverse: boolean; autoUSDCQuote: boolean } = {
      test: true,
      inverse: false,
      autoUSDCQuote: true,
    }
  ): Promise<void> {
    // update tracker
    await this.tracker.updateBalances();

    // check token coherence
    this.checkTokens();
    // check if token1 is USDC
    const isUSDCQuote = this.checkUSDCQuote(
      options.inverse,
      options.autoUSDCQuote
    );

    // extract option for further use
    const inverseMode = options.autoUSDCQuote ? !isUSDCQuote : options.inverse;

    // define basic prices
    const price = inverseMode
      ? this.tracker.pool.invertedPrice
      : this.tracker.pool.price;
    const upperPrice = inverseMode
      ? this.tracker.position.priceLowerBoundInverted
      : this.tracker.position.priceUpperBound;
    const lowerPrice = inverseMode
      ? this.tracker.position.priceUpperBoundInverted
      : this.tracker.position.priceLowerBound;

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
    if (inverseMode) {
      console.log("Inverse mode");
    }
    console.log("Current price: ", price.toString());
    console.log("Upper price: ", upperPrice.toString());
    console.log("Stop loss price: ", stopLossPrice.toString());
    console.log("Bottom price: ", lowerPrice.toString());
    console.log("Current price is below stop loss price: ", belowStopLossPrice);
    console.log("token0 balance: ", token0Balance.toString());
    console.log("token1 balance: ", token1Balance.toString());
    console.log("token0 symbol: ", token0Symbol);
    console.log("token1 symbol: ", token1Symbol);
    const swapExplanation = inverseMode
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

      const tokenInAddress = inverseMode
        ? this.tracker.token1.address
        : this.tracker.token0.address;
      const tokenOutAddress = inverseMode
        ? this.tracker.token0.address
        : this.tracker.token1.address;

      const amountIn = inverseMode ? token1Balance : token0Balance;

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
        return;
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
