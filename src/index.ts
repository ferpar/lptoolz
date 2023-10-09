import dotenv from "dotenv";
dotenv.config();

import { uniswapV3PoolContract } from "./domain/contracts";
import PoolStopLoss from "./domain/poolStopLoss";

const fractionToBottom = 0.75
const positionId = 574861

const poolStopLoss = new PoolStopLoss(fractionToBottom, positionId);

const routine = async () => {
  poolStopLoss.check(true);
};

const init = async () => {
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
