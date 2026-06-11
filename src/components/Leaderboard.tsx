import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Trophy, ShieldAlert, Award, Filter, Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';

interface LeaderboardEntry {
  id: string;
  name: string;
  city: string;
  totalCarbonKg: number;
  carbonSavedKg: number;
  updatedAt?: unknown;
}

interface LeaderboardProps {
  currentUser: User | null;
}

export default function Leaderboard({ currentUser }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filterCity, setFilterCity] = useState('All');
  const [loading, setLoading] = useState(true);

  // Firestore listener for top entries
  useEffect(() => {
    const leaderboardCollection = collection(db, 'leaderboard');
    const q = query(leaderboardCollection, orderBy('carbonSavedKg', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docsData.push({
          id: doc.id,
          name: data.name || 'Anonymous',
          city: data.city || 'Other',
          totalCarbonKg: data.totalCarbonKg || 0,
          carbonSavedKg: data.carbonSavedKg || 0,
          updatedAt: data.updatedAt
        });
      });
      setEntries(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter entries locally
  const filteredEntries = entries.filter(entry => {
    if (filterCity === 'All') return true;
    return entry.city === filterCity;
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Award className="w-5 h-5 text-amber-500" />;
      case 1: return <Award className="w-5 h-5 text-zinc-400" />;
      case 2: return <Award className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-xs font-semibold text-zinc-400 pl-1.5">{index + 1}</span>;
    }
  };

  const cities = ['All', 'Bengaluru', 'Mumbai', 'Chennai', 'Kolkata', 'Delhi', 'Pune'];

  return (
    <div className="space-y-6">
      
      {/* Introduction Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-lg">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Eco-Tracer Leaderboard</h2>
            <p className="text-xs text-brand-100 mt-1">
              Celebrating the Indian households and professionals making the largest carbon footprint reductions.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Content Card */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        
        {/* Table Toolbar */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-[#0e0e12] border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Top Contributors</h3>
          
          {/* City filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none text-zinc-750 dark:text-zinc-200"
            >
              {cities.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All India' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <span className="text-xs text-zinc-500 font-medium">Fetching leaderboard standings...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <ShieldAlert className="w-8 h-8 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-750 dark:text-zinc-300">No Standings Yet</span>
            <span className="text-xs text-zinc-500">Be the first to submit logs in your region!</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                  <th className="py-3.5 px-6">Rank</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Region</th>
                  <th className="py-3.5 px-6 text-right">Saved Carbon</th>
                  <th className="py-3.5 px-6 text-right">Current Footprint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850 text-xs">
                {filteredEntries.map((entry, index) => {
                  const isCurrentUser = currentUser && entry.id === currentUser.uid;
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors ${
                        isCurrentUser 
                          ? 'bg-brand-50/50 dark:bg-brand-950/20 font-bold border-l-4 border-l-brand-600'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <td className="py-4 px-6 flex items-center gap-2">
                        {getRankIcon(index)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span>{entry.name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-brand-600 text-white px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-500 dark:text-zinc-400">
                        {entry.city}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-brand-600 dark:text-brand-400">
                        {Math.round(entry.carbonSavedKg)} kg/mo
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-zinc-650 dark:text-zinc-400">
                        {Math.round(entry.totalCarbonKg)} kg/mo
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
      
    </div>
  );
}
