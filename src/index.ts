import dotenv from "dotenv";
dotenv.config();

import { uniswapV3PoolContract } from "./domain/contracts";
import PoolStopLoss from "./domain/poolStopLoss";

import { getPositionIds } from "./sdk/libs/liquidity";
import { decreaseLiquidity } from "./domain/decreaseLiquidity";
import { collectFees } from "./domain/collectFees";

import { getGasPrice } from "./domain/gasPrice";
import { executeSwap } from "./sdk/libs/routing";


const fractionToBottom = 0.75
const positionId = 572042
const poolStopLoss = new PoolStopLoss(fractionToBottom, positionId);

const routine = async () => {
  poolStopLoss.check(true);
};

const init = async () => {
  const positions = await getPositionIds();
  console.log("positions for provided address", positions)

  // console.log("calling decreaseLiquidity for positionId", positionId)
  // const receipt = await decreaseLiquidity(positionId, true);  // true means 100% of liquidity
  // const feesReceipt = await collectFees(positionId);
  // console.log("decreaseLiquidity tx ", receipt)
  // console.log("collectFees tx ", feesReceipt)

  // const gasPrice = await getGasPrice();
  // console.log("gasPrice: " + gasPrice + " gwei")

  console.log('calling executeSwap')
  const swapReceipt = await executeSwap();
  console.log('executeSwap tx', swapReceipt)

  await poolStopLoss.init();
  // trigger getPoolPrice on swap event
  uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
    await routine();
  });
};

const main = async (): Promise<void> => {
  console.log("Starting...");

  await init();
  await routine();
  console.log("initialized successfully");
  // do not close the process
  process.stdin.resume();

  // handle exit signals
  const exitHandler = async (signal: any): Promise<void> => {
    if (signal) {
      console.log(`Received ${signal}.`);
    }
    console.log("Exiting...");
    process.exit(0);
  };

  // handle ctrl+c event
  process.on("SIGINT", exitHandler);

  // handle kill
  process.on("SIGTERM", exitHandler);
};

(async () => {
  await main();
})();
