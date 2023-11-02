import dotenv from "dotenv";
dotenv.config();

import { uniswapV3PoolContract } from "./domain/contracts";

import PositionTracker, { IPositionTracker } from "./domain/PositionTracker";
import LiquidityManager, { ILiquidityManager } from "./domain/LiquidityManager";

// safe fraction to bottom of 0.6 in case FRACTION_TO_BOTTOM is not set
const fractionToBottom = Number(process.env.FRACTION_TO_BOTTOM) || 0.6;
const positionId = process.env.POSITION_ID
  ? Number(process.env.POSITION_ID)
  : 0;
let positionTracker: IPositionTracker;
let liquidityManager: ILiquidityManager;
let isExecuting: boolean = false;

const routine = async () => {
  // abort if already executing
  if (isExecuting) {
    console.log("already executing");
    return;
  }
  // prevent concurrent executions
  isExecuting = true;
  console.log("swap event triggered");
  try {
    await liquidityManager.manage(fractionToBottom, {
      test: true,
      inverse: false,
      autoUSDCQuote: true,
    });
  } catch (e) {
    console.error("Error running routine", e);
  }
  // allow next execution
  isExecuting = false;
};

const init = async () => {
  positionTracker = await PositionTracker.getInstance(positionId);
  liquidityManager = new LiquidityManager(positionTracker);

  uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
    await routine();
  });
};

const main = async (): Promise<void> => {
  console.log("Starting...");

  await init();
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
