import { IPositionTracker } from "./PositionTracker";
import { decreaseLiquidity } from "./decreaseLiquidity";
import { collectFees } from "./collectFees";
interface ILiquidityManager {
    withdraw(proportion?: number): Promise<void>;
    withdrawAndSwapToStablecoin(proportion?: number): Promise<void>;
}

export default class LiquidityManager implements ILiquidityManager {
    fractionToBottom: number;
    tracker: IPositionTracker;
    exited: boolean = false;
    constructor(
        fractionToBottom: number,
        tracker: IPositionTracker
    ) {
        this.fractionToBottom = fractionToBottom;
        this.tracker = tracker;
    }

    public async withdraw(): Promise<void> {
        if (this.exited) return
        this.exited = true;
        const positionId = this.tracker.position.positionId;
        console.log("calling decreaseLiquidity for positionId", positionId)
        const receipt = await decreaseLiquidity(positionId, true);  // true means 100% of liquidity
        const feesReceipt = await collectFees(positionId);
        console.log("decreaseLiquidity tx ", receipt)
        console.log("collectFees tx ", feesReceipt)    
    }

    public async withdrawAndSwapToStablecoin(): Promise<void> {
        if (this.exited) return
        this.exited = true;

    }
}