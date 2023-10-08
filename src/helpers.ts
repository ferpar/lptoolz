function imperLoss (newPrice: number, oldPrice: number, lowerPriceLimit: number, higherPriceLimit: number): number {
	const k = newPrice / oldPrice
	
	const numerator = (2 * k ** 0.5 - 1 - k)
	const denominator = 1 + k - (lowerPriceLimit/oldPrice) ** 0.5 - k * ( oldPrice/higherPriceLimit) ** 0.5
	
	const lossRatio = numerator/denominator
	
	return lossRatio
	}
	