import dotenv from "dotenv";
dotenv.config();

import { uniswapV3PoolContract } from "./domain/contracts";
import { printData } from "./domain/PriceOracle";

const init = async () => {
  // trigger getPoolPrice on swap event
  uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
    printData();
  });
};

const main = async (): Promise<void> => {
  console.log("Starting...");
  await init();
  printData();
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
