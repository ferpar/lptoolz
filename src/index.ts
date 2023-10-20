import dotenv from "dotenv";
dotenv.config();

import { uniswapV3PoolContract } from "./domain/contracts";

import PositionTracker, { IPositionTracker } from "./domain/PositionTracker";
import LiquidityManager, { ILiquidityManager } from "./domain/LiquidityManager";

const fractionToBottom = 0.75;
const positionId = process.env.POSITION_ID
  ? Number(process.env.POSITION_ID)
  : 0;
let positionTracker: IPositionTracker;
let liquidityManager: ILiquidityManager;

const routine = async () => {
  console.log("swap event triggered");
  await liquidityManager.stopLoss(fractionToBottom, { test: true });
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
