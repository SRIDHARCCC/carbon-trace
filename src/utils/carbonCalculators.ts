export interface UtilityLog {
  electricityKwh: number;
  electricityInr: number;
  electricityBoard: string;
  lpgCylindersCount: number;
  lpgCylindersDepletionDays: number;
}

export interface TransportLog {
  metroKm: number;
  localTrainKm: number;
  autoRickshawKm: number;
  twoWheelerKm: number;
  twoWheelerType: 'petrol' | 'electric';
  carKm: number;
  carType: 'petrol' | 'diesel' | 'cng' | 'ev';
}

export interface DietLog {
  vegetarianMeals: number;
  nonVegetarianMeals: number;
  veganMeals: number;
  dairyLiters: number;
  foodWasteKg: number;
}

export interface InfrastructureLog {
  acBaselineTemp: number;
  acHoursPerDay: number;
  solarInstalledKw: number;
  starAppliancesCount: number;
}

export interface FootprintDocument {
  utilities: UtilityLog;
  transport: TransportLog;
  diet: DietLog;
  infrastructure: InfrastructureLog;
}

// 1. Utilities Constants
export const ELECTRICITY_BOARD_FACTORS: Record<string, number> = {
  'BESCOM (Karnataka)': 0.82,
  'MSEB (Maharashtra)': 0.84,
  'TNEB (Tamil Nadu)': 0.78,
  'WBSEDCL (West Bengal)': 0.85,
  'UPPCL (Uttar Pradesh)': 0.86,
  'PSPCL (Punjab)': 0.83,
  'Other / National Average': 0.82,
};

// Average cost per unit (kWh) in India for estimation if user enters INR
export const ESTIMATED_COST_PER_UNIT = 7.5; // Rs per kWh

export const LPG_CYLINDER_EMISSION = 42.5; // kg CO2e per 14.2 kg cylinder

// 2. Transport Constants (kg CO2e per km)
export const TRANSPORT_FACTORS = {
  metro: 0.015,
  localTrain: 0.012,
  autoRickshaw: 0.08,
  twoWheeler: {
    petrol: 0.045,
    electric: 0.010,
  },
  car: {
    petrol: 0.14,
    diesel: 0.16,
    cng: 0.09,
    ev: 0.03,
  }
};

// 3. Diet Constants (kg CO2e per unit)
export const DIET_FACTORS = {
  veganMeal: 0.40,
  vegetarianMeal: 0.60,
  nonVegetarianMeal: 2.10,
  dairyLiter: 1.20,
  foodWasteKg: 1.90,
};

// 4. Infrastructure / Savings Constants
export const AC_BASE_TEMP = 24; // Optimal temperature benchmark in India
export const AC_EMISSION_PER_HOUR = 0.8; // Average kg CO2e per hour at 24°C (increases by 6% per degree below 24°C)
export const SOLAR_OFFSET_PER_KW_MONTH = 120 * 0.82; // ~120 kWh generated per kW capacity * grid emission factor

/**
 * Calculates Utilities Carbon Footprint (kg CO2e per month)
 */
export function calculateUtilitiesFootprint(log: UtilityLog): number {
  let kwh = log.electricityKwh;
  if (kwh <= 0 && log.electricityInr > 0) {
    kwh = log.electricityInr / ESTIMATED_COST_PER_UNIT;
  }
  
  const boardFactor = ELECTRICITY_BOARD_FACTORS[log.electricityBoard] || 0.82;
  const electricityFootprint = kwh * boardFactor;

  // LPG depletion calculation (fraction of cylinder used per month)
  // standard monthly usage = (30 / depletion_days) * cylinders_count
  let lpgFootprint = 0;
  if (log.lpgCylindersCount > 0 && log.lpgCylindersDepletionDays > 0) {
    const monthsFraction = 30 / log.lpgCylindersDepletionDays;
    lpgFootprint = log.lpgCylindersCount * monthsFraction * LPG_CYLINDER_EMISSION;
  }

  return electricityFootprint + lpgFootprint;
}

/**
 * Calculates Transport Carbon Footprint (kg CO2e per month)
 */
export function calculateTransportFootprint(log: TransportLog): number {
  const metroFootprint = log.metroKm * TRANSPORT_FACTORS.metro;
  const trainFootprint = log.localTrainKm * TRANSPORT_FACTORS.localTrain;
  const autoFootprint = log.autoRickshawKm * TRANSPORT_FACTORS.autoRickshaw;
  
  const twoWheelerFactor = TRANSPORT_FACTORS.twoWheeler[log.twoWheelerType] || TRANSPORT_FACTORS.twoWheeler.petrol;
  const twoWheelerFootprint = log.twoWheelerKm * twoWheelerFactor;

  const carFactor = TRANSPORT_FACTORS.car[log.carType] || TRANSPORT_FACTORS.car.petrol;
  const carFootprint = log.carKm * carFactor;

  return metroFootprint + trainFootprint + autoFootprint + twoWheelerFootprint + carFootprint;
}

/**
 * Calculates Diet Carbon Footprint (kg CO2e per month)
 */
export function calculateDietFootprint(log: DietLog): number {
  const veganFootprint = log.veganMeals * DIET_FACTORS.veganMeal;
  const vegFootprint = log.vegetarianMeals * DIET_FACTORS.vegetarianMeal;
  const nonVegFootprint = log.nonVegetarianMeals * DIET_FACTORS.nonVegetarianMeal;
  const dairyFootprint = log.dairyLiters * DIET_FACTORS.dairyLiter;
  const wasteFootprint = log.foodWasteKg * DIET_FACTORS.foodWasteKg;

  return veganFootprint + vegFootprint + nonVegFootprint + dairyFootprint + wasteFootprint;
}

/**
 * Calculates Infrastructure Footprint and potential offsets
 */
export function calculateInfrastructureFootprint(log: InfrastructureLog): number {
  // AC consumption base (depends on temperature baseline)
  // For each degree below 24°C, emission increases by ~6%. For each degree above, it decreases.
  const tempDiff = AC_BASE_TEMP - log.acBaselineTemp; // Positive if colder (e.g. baseline 20°C -> +4)
  const factorModifier = 1 + (tempDiff * 0.06);
  const acFootprint = log.acHoursPerDay * 30 * AC_EMISSION_PER_HOUR * Math.max(0.5, factorModifier);

  // Solar offset (subtracted from footprint)
  const solarOffset = log.solarInstalledKw * SOLAR_OFFSET_PER_KW_MONTH;

  // Star appliances offset (approximate: 5kg savings per star-appliance per month)
  const applianceSavings = log.starAppliancesCount * 5;

  return Math.max(0, acFootprint - solarOffset - applianceSavings);
}

/**
 * Computes the total carbon footprint for all modules
 */
export function calculateTotalFootprint(doc: FootprintDocument): number {
  const utils = calculateUtilitiesFootprint(doc.utilities);
  const transport = calculateTransportFootprint(doc.transport);
  const diet = calculateDietFootprint(doc.diet);
  const infra = calculateInfrastructureFootprint(doc.infrastructure);

  return utils + transport + diet + infra;
}

/**
 * Returns comparison against standard Indian urban benchmarks (per month)
 * Average Indian urban citizen: ~150 kg CO2e / month
 */
export function getBenchmarkComparison(totalKg: number) {
  const benchmark = 150; // kg CO2e
  const percentage = (totalKg / benchmark) * 100;
  const diff = totalKg - benchmark;

  return {
    benchmark,
    percentage,
    diff,
    status: totalKg < benchmark ? 'Eco-Friendly' : totalKg < benchmark * 1.5 ? 'Average' : 'High Emission'
  };
}
