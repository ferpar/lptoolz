const ethers = require('ethers')
require("dotenv").config()

const provider = new ethers.WebSocketProvider(
    `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
)

// pool for uscd/eth at 0.05% fee tier
const UniV3PoolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
const uniswapV3PoolAbi = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

const uniswapV3PoolContract = new ethers.Contract(
    UniV3PoolAddress,
    uniswapV3PoolAbi.abi,
    provider
)

const getPoolPrice = async () => {
    const slot0 = await uniswapV3PoolContract.slot0()
    const sqrtRatioX96 = slot0.sqrtPriceX96.toString()
    const price = (sqrtRatioX96 ** 2) / (2 ** 192)
    return price
}

const init = async () => {
    // trigger getPoolPrice on swap event
    uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
        const poolPrice = await getPoolPrice()
        console.log(`Pool price: ${poolPrice}`)
    })
}

const main = async () => {
    console.log("Starting...")
    await init()
    console.log("initialized successfully")
    // do not close the process
    process.stdin.resume()

    // handle exit signals
    const exitHandler = async (signal) => {
        if (signal) {
            console.log(`Received ${signal}.`)
        }
        console.log("Exiting...")
        process.exit(0)
    }
    process.abort = exitHandler
}

main()