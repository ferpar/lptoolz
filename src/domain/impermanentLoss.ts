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
function lossEstimation(high: number, low: number, fraction: number): object {
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
