import dotenv from "dotenv";
dotenv.config();
import { IPositionTracker } from "./PositionTracker";
import { decreaseLiquidity } from "./decreaseLiquidity";
import { collectFees } from "./collectFees";
import { swapTokens } from "./swapTokens";
import Big from "big.js";
import { lossEstimation } from "./impermanentLoss";
export interface ILiquidityManager {
  withdraw(proportion?: number): Promise<void>;
  manage(
    fractionToBottom: number,
    options: {
      test: boolean;
      inverse: boolean;
      autoUSDCQuote: boolean;
      counterDump: boolean;
    }
  ): Promise<void>;
}

export default class LiquidityManager implements ILiquidityManager {
  tracker: IPositionTracker;
  // this is to prevent multiple calls to withdraw
  exited: boolean = false;
  sold: boolean = false;
  amountIn: Big = Big(0);
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
        if (autoUSDCQuote) {
          throw new Error(
            "NO USDC IN POSITION, CHECK POSITION OR SET AUTOUSDCQUOTE TO FALSE"
          );
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
    fractionToExit: number = 0.4,
    options: {
      test: boolean;
      inverse: boolean;
      autoUSDCQuote: boolean;
      counterDump: boolean;
    } = {
      test: true,
      inverse: false,
      autoUSDCQuote: true,
      counterDump: true,
    }
  ): Promise<void> {
    const extraFraction = 0.3;
    const fractionToStopLoss = fractionToExit + extraFraction;

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

    const dumpFactor = 1.1; // 1.5x the impermanent loss
    const lossEstimate = lossEstimation(
      upperPrice.toNumber(),
      lowerPrice.toNumber(),
      fractionToExit
    );

    // derive exit / stop loss price
    const priceDifference = upperPrice.sub(lowerPrice);
    const exitPrice = upperPrice.sub(priceDifference.times(fractionToExit));
    const stopLossPrice = upperPrice.sub(
      priceDifference.times(fractionToStopLoss)
    );
    // for the dumpPrice we use the impermanent loss estimate fraction
    const dumpPrice = exitPrice.times(1 - dumpFactor * lossEstimate.impLoss);

    // check if current price is below exit or stop loss price
    const belowExitPrice = price.lt(exitPrice);
    const belowStopLossPrice = price.lt(stopLossPrice);
    const aboveDumpPrice = price.gt(dumpPrice);

    // get balances and symbols
    const token0Balance = this.tracker.position.token0Balance;
    const token1Balance = this.tracker.position.token1Balance;
    const token0Symbol = this.tracker.token0.symbol;
    const token1Symbol = this.tracker.token1.symbol;

    // log everything
    if (inverseMode) {
      console.log("Inverse mode");
    }
    console.log(
      `exit: ${fractionToExit}, stop loss: ${fractionToStopLoss}, lossEstimate fraction: ${lossEstimate.impLoss}`
    );
    console.log("Current price: ", price.toString());
    console.log("Upper price: ", upperPrice.toString());
    console.log("Exit price: ", exitPrice.toString());
    console.log("Stop loss price: ", stopLossPrice.toString());
    console.log("Dump price: ", dumpPrice.toString());
    console.log("Bottom price: ", lowerPrice.toString());
    console.log("Current price is below exit price: ", belowExitPrice);
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

    if (belowExitPrice) {
      if (this.exited) return;
      this.exited = true;
      console.log("below exit price, exiting position");

      const amountIn = inverseMode ? token1Balance : token0Balance;
      this.amountIn = amountIn;

      console.log("withdrawing liquidity");
      await this.withdraw();

      if (!options.counterDump) {
        this.sold = true;
        const tokenInAddress = inverseMode
          ? this.tracker.token1.address
          : this.tracker.token0.address;
        const tokenOutAddress = inverseMode
          ? this.tracker.token0.address
          : this.tracker.token1.address;

        console.log("swapping to stablecoin");
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

    // this code should only execute once belowExitPrice already
    // executed (this.exited === true). this.amountIn will be set there
    if (aboveDumpPrice || belowStopLossPrice) {
      if (!this.exited) return;
      if (this.sold) return;
      this.sold = true;

      console.log(
        aboveDumpPrice
          ? "above dump price, selling non-stable tokens"
          : "below stop loss price, selling non-stable tokens"
      );

      const amountIn = this.amountIn;

      const tokenInAddress = inverseMode
        ? this.tracker.token1.address
        : this.tracker.token0.address;
      const tokenOutAddress = inverseMode
        ? this.tracker.token0.address
        : this.tracker.token1.address;

      console.log("swapping to stablecoin");
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
