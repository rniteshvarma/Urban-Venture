export interface CalculationResult {
  year: number;
  realEstateMin: number;
  realEstateMax: number;
  fd: number;
  nifty: number;
  gold: number;
  realEstateRentMin: number;
  realEstateRentMax: number;
}

export interface CalculatorSummary {
  yearlyData: CalculationResult[];
  finalRealEstateMin: number;
  finalRealEstateMax: number;
  finalFD: number;
  finalNifty: number;
  finalGold: number;
  appreciationCagrMin: number;
  appreciationCagrMax: number;
  rentalYieldMin: number;
  rentalYieldMax: number;
}

/**
 * Comparison rates, % a year. These are fixed example assumptions, not measured
 * or sourced returns — every screen that shows them must say so.
 */
export const BENCHMARK_RATES = { fd: 6.5, nifty: 12, gold: 9 } as const;

export function runRoiCalculations(
  initialAmount: number, // in Lakhs
  years: number,
  cagrMin: number,
  cagrMax: number,
  rentMin: number = 0,
  rentMax: number = 0
): CalculatorSummary {
  const yearlyData: CalculationResult[] = [];
  
  // Benchmark rates (example assumptions — see BENCHMARK_RATES)
  const FD_CAGR = BENCHMARK_RATES.fd / 100;
  const NIFTY_CAGR = BENCHMARK_RATES.nifty / 100;
  const GOLD_CAGR = BENCHMARK_RATES.gold / 100;

  let reValMin = initialAmount;
  let reValMax = initialAmount;
  let reRentCumMin = 0;
  let reRentCumMax = 0;

  let fdVal = initialAmount;
  let niftyVal = initialAmount;
  let goldVal = initialAmount;

  // Year 0 (Initial)
  yearlyData.push({
    year: 0,
    realEstateMin: Math.round(initialAmount * 100) / 100,
    realEstateMax: Math.round(initialAmount * 100) / 100,
    fd: Math.round(initialAmount * 100) / 100,
    nifty: Math.round(initialAmount * 100) / 100,
    gold: Math.round(initialAmount * 100) / 100,
    realEstateRentMin: 0,
    realEstateRentMax: 0
  });

  for (let y = 1; y <= years; y++) {
    // 1. Real Estate Appreciation
    reValMin = reValMin * (1 + cagrMin / 100);
    reValMax = reValMax * (1 + cagrMax / 100);

    // 2. Rental Income (based on end-of-year or beginning-of-year value, let's use beginning of year value)
    const prevMinVal = yearlyData[y - 1].realEstateMin;
    const prevMaxVal = yearlyData[y - 1].realEstateMax;
    
    const rentMinIncome = prevMinVal * (rentMin / 100);
    const rentMaxIncome = prevMaxVal * (rentMax / 100);

    reRentCumMin += rentMinIncome;
    reRentCumMax += rentMaxIncome;

    // 3. Benchmarks
    fdVal = fdVal * (1 + FD_CAGR);
    niftyVal = niftyVal * (1 + NIFTY_CAGR);
    goldVal = goldVal * (1 + GOLD_CAGR);

    // Store yearly data, rounding to 2 decimal places
    yearlyData.push({
      year: y,
      realEstateMin: Math.round((reValMin + reRentCumMin) * 100) / 100,
      realEstateMax: Math.round((reValMax + reRentCumMax) * 100) / 100,
      fd: Math.round(fdVal * 100) / 100,
      nifty: Math.round(niftyVal * 100) / 100,
      gold: Math.round(goldVal * 100) / 100,
      realEstateRentMin: Math.round(reRentCumMin * 100) / 100,
      realEstateRentMax: Math.round(reRentCumMax * 100) / 100
    });
  }

  return {
    yearlyData,
    finalRealEstateMin: Math.round((reValMin + reRentCumMin) * 100) / 100,
    finalRealEstateMax: Math.round((reValMax + reRentCumMax) * 100) / 100,
    finalFD: Math.round(fdVal * 100) / 100,
    finalNifty: Math.round(niftyVal * 100) / 100,
    finalGold: Math.round(goldVal * 100) / 100,
    appreciationCagrMin: cagrMin,
    appreciationCagrMax: cagrMax,
    rentalYieldMin: rentMin,
    rentalYieldMax: rentMax
  };
}
