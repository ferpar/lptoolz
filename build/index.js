"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const big_js_1 = __importDefault(require("big.js"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const provider = new ethers_1.ethers.WebSocketProvider(`wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
// pool for uscd/eth at 0.05% fee tier
const UniV3PoolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const uniswapV3PoolAbi = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const uniswapV3PoolContract = new ethers_1.ethers.Contract(UniV3PoolAddress, uniswapV3PoolAbi.abi, provider);
const getPoolPrice = () => __awaiter(void 0, void 0, void 0, function* () {
    const slot0 = yield uniswapV3PoolContract.slot0();
    const sqrtRatioX96 = slot0.sqrtPriceX96.toString();
    const price = sqrtRatioX96 ** 2 / 2 ** 192;
    return price;
});
const getPriceInUSD = (priceIn18Decimals) => {
    // const price10 = priceIn18Decimals / 10 ** 18 in Big
    const price10 = new big_js_1.default(priceIn18Decimals).div((0, big_js_1.default)(10).pow(18));
    const price01 = price10.pow(-1).mul((0, big_js_1.default)(10).pow(-6));
    return price01;
};
const getEthPrice = () => __awaiter(void 0, void 0, void 0, function* () {
    const ethPriceResponse = yield axios_1.default.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const ethPriceData = ethPriceResponse.data;
    return ethPriceData.ethereum.usd;
});
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    // trigger getPoolPrice on swap event
    uniswapV3PoolContract.on("Swap", (sender, amount0, amount1, data) => __awaiter(void 0, void 0, void 0, function* () {
        const poolPrice = yield getPoolPrice();
        const price = yield getEthPrice();
        const price2 = getPriceInUSD(poolPrice);
        console.log(`ETH price: ${price}`);
        console.log(`Pool price: ${poolPrice}`);
        console.log(`Pool price local: ${price2}`);
    }));
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Starting...");
    yield init();
    const poolPrice = yield getPoolPrice();
    const price = yield getEthPrice();
    const price2 = getPriceInUSD(poolPrice);
    console.log(`Pool price: ${poolPrice}`);
    console.log(`ETH price: ${price}`);
    console.log(`Pool price local: ${price2}`);
    console.log("initialized successfully");
    // do not close the process
    process.stdin.resume();
    // handle exit signals
    const exitHandler = (signal) => __awaiter(void 0, void 0, void 0, function* () {
        if (signal) {
            console.log(`Received ${signal}.`);
        }
        console.log("Exiting...");
        process.exit(0);
    });
    // handle ctrl+c event
    process.on("SIGINT", exitHandler);
    // handle kill
    process.on("SIGTERM", exitHandler);
});
main();
