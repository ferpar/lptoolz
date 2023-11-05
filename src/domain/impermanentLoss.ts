// source   https://medium.com/auditless/impermanent-loss-in-uniswap-v3-6c7161d3b445
function imperLoss(
  newPrice: number,
  oldPrice: number,
  lowerPriceLimit: number,
  higherPriceLimit: number
): number {
  const k = newPrice / oldPrice;

  const numerator = 2 * k ** 0.5 - 1 - k;
  const denominator =
    1 +
    k -
    (lowerPriceLimit / oldPrice) ** 0.5 -
    k * (oldPrice / higherPriceLimit) ** 0.5;

  const lossRatio = numerator / denominator;

  return lossRatio;
}

// higherPriceLimit = 1
// oldPrice = higherPriceLimit
// ratioBelow = newPrice / oldPrice = newPrice / higherPriceLimit = newPrice / 1 = newPrice
// invervalRatioBelow = lowerPriceLimit / higherPriceLimit = lowerPriceLimit / oldPrice = lowerPriceLimit / 1 = lowerPriceLimit
function imperLossBelowStablecoin(
  ratioBelow: number,
  intervalRatioBelow: number
): number {
  return imperLoss(ratioBelow, 1, intervalRatioBelow, 1);
}

// assuming that you are only using stablecoins and setting
// ranges below the current price
type LossEstimate = {
  stopLoss: number;
  impLoss: number;
  impLossPercent: number;
  impLoss1000: number;
  impLoss5000: number;
  rangeFraction: number;
  rangePercent: number;
}
export function lossEstimation(high: number, low: number, fraction: number): LossEstimate {
  const stopLoss = high - (high - low) * fraction;
  const impLoss = imperLoss(stopLoss, high, low, high);
  const rangeFraction = (high - low) / high;

  const estimates = {
    stopLoss,
    impLoss,
    impLossPercent: impLoss * 100,
    impLoss1000: impLoss * 1000,
    impLoss5000: impLoss * 5000,
    rangeFraction,
    rangePercent: rangeFraction * 100,
  };

  return estimates;
}

// given a high price and a stoploss price, compute the low price for a fraction
export function lowPriceEstimation(
  high: number,
  stopLoss: number,
  fraction: number
): number {
  const low = (stopLoss - high) / fraction + high;
  return low;
}

export function getEstimatesStoploss(
  high: number,
  stopLoss: number,
  fraction: number
): object {
  const low = (stopLoss - high) / fraction + high;
  const impLoss = imperLoss(stopLoss, high, low, high)
  const rangeFraction = (high - low) / high;
  const stopLossFraction = (high - stopLoss) / high;
  const estimates = {
    low,
    impLoss,
    impLossPercent: impLoss * 100,
    impLoss1000: impLoss * 1000,
    impLoss5000: impLoss * 5000,
    rangeFraction,
    stopLossFraction,
    rangePercent: rangeFraction * 100,
    stopLossPercent: stopLossFraction * 100,
  }
  return estimates;
}
