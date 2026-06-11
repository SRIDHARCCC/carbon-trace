import { describe, it, expect } from 'vitest';
import { 
  calculateUtilitiesFootprint, 
  calculateTransportFootprint, 
  calculateDietFootprint, 
  calculateInfrastructureFootprint, 
  calculateTotalFootprint,
  getBenchmarkComparison
} from './carbonCalculators';
import type {
  UtilityLog,
  TransportLog,
  DietLog,
  InfrastructureLog,
  FootprintDocument
} from './carbonCalculators';

describe('Carbon Calculators Unit Tests', () => {

  it('calculates utilities footprint correctly', () => {
    // Test with kWh input
    const log1: UtilityLog = {
      electricityKwh: 200,
      electricityInr: 0,
      electricityBoard: 'BESCOM (Karnataka)',
      lpgCylindersCount: 0,
      lpgCylindersDepletionDays: 0
    };
    // 200 * 0.82 = 164
    expect(calculateUtilitiesFootprint(log1)).toBeCloseTo(164);

    // Test with LPG cylinders
    const log2: UtilityLog = {
      electricityKwh: 0,
      electricityInr: 0,
      electricityBoard: 'Other / National Average',
      lpgCylindersCount: 1,
      lpgCylindersDepletionDays: 30
    };
    // 1 * (30/30) * 42.5 = 42.5
    expect(calculateUtilitiesFootprint(log2)).toBeCloseTo(42.5);

    // Test with INR billing cost estimation
    const log3: UtilityLog = {
      electricityKwh: 0,
      electricityInr: 1500, // 1500 / 7.5 = 200 kWh
      electricityBoard: 'UPPCL (Uttar Pradesh)', // factor: 0.86
      lpgCylindersCount: 2,
      lpgCylindersDepletionDays: 60 // 2 * (30/60) * 42.5 = 42.5
    };
    // 200 * 0.86 + 42.5 = 172 + 42.5 = 214.5
    expect(calculateUtilitiesFootprint(log3)).toBeCloseTo(214.5);

    // Test other state electricity boards
    const boards = [
      { name: 'MSEB (Maharashtra)', factor: 0.84 },
      { name: 'TNEB (Tamil Nadu)', factor: 0.78 },
      { name: 'WBSEDCL (West Bengal)', factor: 0.85 },
      { name: 'PSPCL (Punjab)', factor: 0.83 }
    ];
    boards.forEach(b => {
      const boardLog: UtilityLog = {
        electricityKwh: 100,
        electricityInr: 0,
        electricityBoard: b.name,
        lpgCylindersCount: 0,
        lpgCylindersDepletionDays: 0
      };
      expect(calculateUtilitiesFootprint(boardLog)).toBeCloseTo(100 * b.factor);
    });
  });

  it('calculates transport footprint correctly', () => {
    // Petrol modes
    const log1: TransportLog = {
      metroKm: 100, // 100 * 0.015 = 1.5
      localTrainKm: 200, // 200 * 0.012 = 2.4
      autoRickshawKm: 50, // 50 * 0.08 = 4.0
      twoWheelerKm: 100, // 100 * 0.045 = 4.5
      twoWheelerType: 'petrol',
      carKm: 100, // 100 * 0.14 = 14.0
      carType: 'petrol'
    };
    // Total = 1.5 + 2.4 + 4.0 + 4.5 + 14.0 = 26.4
    expect(calculateTransportFootprint(log1)).toBeCloseTo(26.4);

    // Electric & Alternative fuel modes
    const log2: TransportLog = {
      metroKm: 0,
      localTrainKm: 0,
      autoRickshawKm: 0,
      twoWheelerKm: 200, // 200 * 0.010 = 2.0
      twoWheelerType: 'electric',
      carKm: 150, // 150 * 0.03 = 4.5
      carType: 'ev'
    };
    expect(calculateTransportFootprint(log2)).toBeCloseTo(6.5);

    // Diesel car
    const log3: TransportLog = {
      metroKm: 0,
      localTrainKm: 0,
      autoRickshawKm: 0,
      twoWheelerKm: 0,
      twoWheelerType: 'petrol',
      carKm: 100, // 100 * 0.16 = 16.0
      carType: 'diesel'
    };
    expect(calculateTransportFootprint(log3)).toBeCloseTo(16.0);

    // CNG car
    const log4: TransportLog = {
      metroKm: 0,
      localTrainKm: 0,
      autoRickshawKm: 0,
      twoWheelerKm: 0,
      twoWheelerType: 'petrol',
      carKm: 100, // 100 * 0.09 = 9.0
      carType: 'cng'
    };
    expect(calculateTransportFootprint(log4)).toBeCloseTo(9.0);
  });

  it('calculates diet footprint correctly', () => {
    const log1: DietLog = {
      vegetarianMeals: 40, // 40 * 0.6 = 24
      nonVegetarianMeals: 20, // 20 * 2.1 = 42
      veganMeals: 10, // 10 * 0.4 = 4
      dairyLiters: 5, // 5 * 1.2 = 6
      foodWasteKg: 2 // 2 * 1.9 = 3.8
    };
    // Total = 24 + 42 + 4 + 6 + 3.8 = 79.8
    expect(calculateDietFootprint(log1)).toBeCloseTo(79.8);

    // Zero diets test
    const log2: DietLog = {
      vegetarianMeals: 0,
      nonVegetarianMeals: 0,
      veganMeals: 0,
      dairyLiters: 0,
      foodWasteKg: 0
    };
    expect(calculateDietFootprint(log2)).toBe(0);
  });

  it('calculates infrastructure footprint with savings and offsets', () => {
    // 22°C baseline is colder than optimal 24°C (+2 tempDiff) -> 12% increase
    // acHoursPerDay = 5 -> 5 * 30 = 150 hours
    // Base emission = 150 * 0.8 = 120 kg. Modified = 120 * 1.12 = 134.4
    // Solar: 0 kW (offset 0)
    // Appliances: 2 (offset 10)
    // Total = 134.4 - 10 = 124.4
    const log1: InfrastructureLog = {
      acBaselineTemp: 22,
      acHoursPerDay: 5,
      solarInstalledKw: 0,
      starAppliancesCount: 2
    };
    expect(calculateInfrastructureFootprint(log1)).toBeCloseTo(124.4);

    // Warm temperature settings (e.g. 26°C -> tempDiff -2 -> 12% decrease -> modifier 0.88)
    // 150 hours * 0.8 = 120 kg. Modified = 120 * 0.88 = 105.6
    const log2: InfrastructureLog = {
      acBaselineTemp: 26,
      acHoursPerDay: 5,
      solarInstalledKw: 0,
      starAppliancesCount: 0
    };
    expect(calculateInfrastructureFootprint(log2)).toBeCloseTo(105.6);

    // Clamping of factorModifier test (minimum 0.5)
    // E.g. baseline 35°C -> tempDiff -11 -> factorModifier 0.34 -> clamped to 0.5
    // 150 hours * 0.8 * 0.5 = 60 kg
    const log3: InfrastructureLog = {
      acBaselineTemp: 35,
      acHoursPerDay: 5,
      solarInstalledKw: 0,
      starAppliancesCount: 0
    };
    expect(calculateInfrastructureFootprint(log3)).toBeCloseTo(60);

    // With Solar offset
    const logWithSolar: InfrastructureLog = {
      acBaselineTemp: 24, // 0 tempDiff -> factorModifier = 1
      acHoursPerDay: 4, // 4 * 30 * 0.8 = 96
      solarInstalledKw: 1, // 1 * 120 * 0.82 = 98.4 offset
      starAppliancesCount: 0
    };
    // 96 - 98.4 = -2.4 -> should clamp to 0
    expect(calculateInfrastructureFootprint(logWithSolar)).toBe(0);
  });

  it('computes correct total footprint and benchmark comparisons', () => {
    const doc: FootprintDocument = {
      utilities: {
        electricityKwh: 100, // 82
        electricityInr: 0,
        electricityBoard: 'Other / National Average',
        lpgCylindersCount: 0,
        lpgCylindersDepletionDays: 0
      },
      transport: {
        metroKm: 0,
        localTrainKm: 0,
        autoRickshawKm: 0,
        twoWheelerKm: 0,
        twoWheelerType: 'petrol',
        carKm: 0,
        carType: 'petrol'
      },
      diet: {
        vegetarianMeals: 0,
        nonVegetarianMeals: 0,
        veganMeals: 0,
        dairyLiters: 0,
        foodWasteKg: 0
      },
      infrastructure: {
        acBaselineTemp: 24,
        acHoursPerDay: 0,
        solarInstalledKw: 0,
        starAppliancesCount: 0
      }
    };

    expect(calculateTotalFootprint(doc)).toBe(82);

    const comp1 = getBenchmarkComparison(82);
    expect(comp1.benchmark).toBe(150);
    expect(comp1.percentage).toBeCloseTo((82 / 150) * 100);
    expect(comp1.status).toBe('Eco-Friendly');

    // Average comparison test
    const comp2 = getBenchmarkComparison(180);
    expect(comp2.status).toBe('Average');

    // High emission comparison test
    const comp3 = getBenchmarkComparison(300);
    expect(comp3.status).toBe('High Emission');
  });

});
