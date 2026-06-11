import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  calculateUtilitiesFootprint, 
  calculateTransportFootprint,
  calculateDietFootprint,
  calculateInfrastructureFootprint,
  getBenchmarkComparison,
  ELECTRICITY_BOARD_FACTORS
} from '../utils/carbonCalculators';
import type { FootprintDocument } from '../utils/carbonCalculators';
import { safeParseNumber } from '../utils/security';
import { Save, RefreshCw, Zap, Car, Utensils, Home, BarChart2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TrackingMatrixProps {
  initialData: FootprintDocument | null;
  onSave: (data: FootprintDocument) => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSaving: boolean;
  user: any;
}

const defaultFootprint: FootprintDocument = {
  utilities: {
    electricityKwh: 150,
    electricityInr: 0,
    electricityBoard: 'Other / National Average',
    lpgCylindersCount: 1,
    lpgCylindersDepletionDays: 45
  },
  transport: {
    metroKm: 80,
    localTrainKm: 50,
    autoRickshawKm: 30,
    twoWheelerKm: 150,
    twoWheelerType: 'petrol',
    carKm: 200,
    carType: 'petrol'
  },
  diet: {
    vegetarianMeals: 60,
    nonVegetarianMeals: 30,
    veganMeals: 0,
    dairyLiters: 10,
    foodWasteKg: 4
  },
  infrastructure: {
    acBaselineTemp: 22,
    acHoursPerDay: 4,
    solarInstalledKw: 0,
    starAppliancesCount: 2
  }
};

export default function TrackingMatrix({
  initialData,
  onSave,
  activeTab,
  setActiveTab,
  isSaving,
  user
}: TrackingMatrixProps) {
  // Local state for the logs
  const [formData, setFormData] = useState<FootprintDocument>(defaultFootprint);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Sync with initialData from Firestore if available
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Handle nested form field updates
  const updateField = (module: keyof FootprintDocument, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [field]: value
      }
    }));
  };

  // Calculations memoized to prevent unnecessary renders
  const utilitiesCarbon = useMemo(() => calculateUtilitiesFootprint(formData.utilities), [formData.utilities]);
  const transportCarbon = useMemo(() => calculateTransportFootprint(formData.transport), [formData.transport]);
  const dietCarbon = useMemo(() => calculateDietFootprint(formData.diet), [formData.diet]);
  const infraCarbon = useMemo(() => calculateInfrastructureFootprint(formData.infrastructure), [formData.infrastructure]);

  const totalCarbon = useMemo(() => {
    return utilitiesCarbon + transportCarbon + dietCarbon + infraCarbon;
  }, [utilitiesCarbon, transportCarbon, dietCarbon, infraCarbon]);

  // Compute savings compared to average setup
  const carbonSaved = useMemo(() => {
    // Standard baseline for reference: typical non-optimized Indian household (250 kg)
    const baseline = 220;
    return Math.max(0, baseline - totalCarbon);
  }, [totalCarbon]);

  const comparison = useMemo(() => getBenchmarkComparison(totalCarbon), [totalCarbon]);

  // Reset form
  const handleReset = () => {
    if (window.confirm('Are you sure you want to restore default entries?')) {
      setFormData(initialData || defaultFootprint);
    }
  };

  // Handle Save
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ type: null, message: '' });

    try {
      await onSave(formData);
      setSaveStatus({ type: 'success', message: 'Footprint logs synced successfully.' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Failed to save footprint logs.' });
    }
  };

  // ECharts visualization options
  const chartOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a' }
    },
    legend: {
      bottom: '0%',
      left: 'center',
      textStyle: { color: '#71717a' }
    },
    series: [
      {
        name: 'Carbon Emissions',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            formatter: '{b}\n{c} kg'
          }
        },
        labelLine: {
          show: false
        },
        // Premium palette colors from guidelines
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        data: [
          { value: Math.round(utilitiesCarbon), name: 'Utilities' },
          { value: Math.round(transportCarbon), name: 'Transport' },
          { value: Math.round(dietCarbon), name: 'Diet' },
          { value: Math.round(infraCarbon), name: 'Infrastructure' }
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      
      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Monthly Footprint</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              {Math.round(totalCarbon)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">kg CO2e</span>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              comparison.status === 'Eco-Friendly' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : comparison.status === 'Average'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              {comparison.status}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              vs 150 kg urban benchmark
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Estimated Monthly Savings</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
              {Math.round(carbonSaved)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">kg CO2e</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Compared to non-optimized baseline
          </p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Active Tracker Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full animate-pulse ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
              {user ? 'Synced Cloud' : 'Offline Session'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
            {user ? 'Changes are automatically pushed' : 'Sign in to save progress permanently'}
          </p>
        </div>

      </div>

      {/* 2. Main Content Layout (Split Input Form + Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Side: Inputs */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0e0e12] p-1">
            {[
              { id: 'Utilities', icon: Zap, color: 'text-blue-500' },
              { id: 'Transport', icon: Car, color: 'text-emerald-500' },
              { id: 'Diet', icon: Utensils, color: 'text-amber-500' },
              { id: 'Infrastructure', icon: Home, color: 'text-rose-500' }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-750'
                      : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${tab.color}`} />
                  {tab.id}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSaveSubmit} className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* UTILITIES TAB */}
              {activeTab === 'Utilities' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Utilities Ledger Logs</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">State Electricity Board</label>
                    <select
                      value={formData.utilities.electricityBoard}
                      onChange={(e) => updateField('utilities', 'electricityBoard', e.target.value)}
                      className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                    >
                      {Object.keys(ELECTRICITY_BOARD_FACTORS).map(board => (
                        <option key={board} value={board}>{board}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Power Consumed (kWh)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.utilities.electricityKwh}
                        onChange={(e) => updateField('utilities', 'electricityKwh', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Or Monthly Bill (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.utilities.electricityInr || ''}
                        placeholder="Estimate via Cost"
                        onChange={(e) => updateField('utilities', 'electricityInr', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">LPG Cylinders Depleted</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.utilities.lpgCylindersCount}
                        onChange={(e) => updateField('utilities', 'lpgCylindersCount', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Days Per Cylinder</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.utilities.lpgCylindersDepletionDays}
                        onChange={(e) => updateField('utilities', 'lpgCylindersDepletionDays', safeParseNumber(e.target.value, 30))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TRANSPORT TAB */}
              {activeTab === 'Transport' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Multi-Modal Commute (km / month)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Metro Transit (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.transport.metroKm}
                        onChange={(e) => updateField('transport', 'metroKm', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Local Trains (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.transport.localTrainKm}
                        onChange={(e) => updateField('transport', 'localTrainKm', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Auto-Rickshaws (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.transport.autoRickshawKm}
                        onChange={(e) => updateField('transport', 'autoRickshawKm', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Two-Wheeler Commute (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.transport.twoWheelerKm}
                        onChange={(e) => updateField('transport', 'twoWheelerKm', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Two-Wheeler Fuel</label>
                      <select
                        value={formData.transport.twoWheelerType}
                        onChange={(e) => updateField('transport', 'twoWheelerType', e.target.value)}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      >
                        <option value="petrol">Petrol (Standard)</option>
                        <option value="electric">Electric (EV)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Car Commute (km)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.transport.carKm}
                        onChange={(e) => updateField('transport', 'carKm', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Car Fuel Type</label>
                      <select
                        value={formData.transport.carType}
                        onChange={(e) => updateField('transport', 'carType', e.target.value)}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="cng">CNG</option>
                        <option value="ev">Electric (EV)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DIET TAB */}
              {activeTab === 'Diet' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Dietary Habits (meals / month)</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Vegan Meals</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.diet.veganMeals}
                        onChange={(e) => updateField('diet', 'veganMeals', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Veg Meals</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.diet.vegetarianMeals}
                        onChange={(e) => updateField('diet', 'vegetarianMeals', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Non-Veg Meals</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.diet.nonVegetarianMeals}
                        onChange={(e) => updateField('diet', 'nonVegetarianMeals', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Dairy Intake (Liters)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.diet.dairyLiters}
                        onChange={(e) => updateField('diet', 'dairyLiters', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Food Waste (kg)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.diet.foodWasteKg}
                        onChange={(e) => updateField('diet', 'foodWasteKg', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* INFRASTRUCTURE TAB */}
              {activeTab === 'Infrastructure' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Household Infrastructure</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">AC Temp Baseline (°C)</label>
                      <input
                        type="number"
                        min="16"
                        max="30"
                        value={formData.infrastructure.acBaselineTemp}
                        onChange={(e) => updateField('infrastructure', 'acBaselineTemp', safeParseNumber(e.target.value, 24))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">AC Runtime (hours/day)</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={formData.infrastructure.acHoursPerDay}
                        onChange={(e) => updateField('infrastructure', 'acHoursPerDay', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Rooftop Solar (kW)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.infrastructure.solarInstalledKw}
                        onChange={(e) => updateField('infrastructure', 'solarInstalledKw', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">5-Star Appliances</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.infrastructure.starAppliancesCount}
                        onChange={(e) => updateField('infrastructure', 'starAppliancesCount', safeParseNumber(e.target.value))}
                        className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[8px] px-[12px] py-[8px] text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Form Footer Buttons */}
            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 bg-[#ffffff] dark:bg-[#262626] hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#334155] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-[8px] px-[16px] py-[8px] text-xs font-semibold transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <div className="flex items-center gap-2">
                {saveStatus.type && (
                  <div className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                    saveStatus.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' 
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                  }`}>
                    {saveStatus.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {saveStatus.message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-[8px] px-[16px] py-[8px] text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Syncing...' : 'Save Logs'}
                </button>
              </div>
            </div>

          </form>

        </div>

        {/* Right Side: Charts / Real-time Output */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          {/* ECharts pie chart */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
            <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5 mb-4">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              Footprint Breakdown
            </h4>
            <div className="w-full h-[220px]">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mb-3">Carbon Weight Breakdown</h4>
            <div className="space-y-3">
              {[
                { name: 'Utilities', val: utilitiesCarbon, color: 'bg-blue-500' },
                { name: 'Transport', val: transportCarbon, color: 'bg-emerald-500' },
                { name: 'Diet', val: dietCarbon, color: 'bg-amber-500' },
                { name: 'Infrastructure', val: infraCarbon, color: 'bg-rose-500' },
              ].map(item => {
                const share = totalCarbon > 0 ? (item.val / totalCarbon) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <span>{item.name}</span>
                      <span>{Math.round(item.val)} kg ({Math.round(share)}%)</span>
                    </div>
                    {/* Sparkline Indicator */}
                    <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
