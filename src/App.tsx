import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import TrackingMatrix from './components/TrackingMatrix';
import EcoAgentPanel from './components/EcoAgentPanel';
import Leaderboard from './components/Leaderboard';
import AuthModal from './components/AuthModal';
import { auth, db, functions } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Bot } from 'lucide-react';
import type { FootprintDocument } from './utils/carbonCalculators';

// Helper to get current month ID (e.g., "2026-06")
const getCurrentMonthId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function App() {
  const [activeView, setActiveView] = useState<'tracker' | 'leaderboard'>('tracker');
  const [activeTab, setActiveTab] = useState('Utilities');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Footprint State
  const [activeFootprint, setActiveFootprint] = useState<FootprintDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Data Loading Helpers
  const loadOfflineData = useCallback(() => {
    const saved = localStorage.getItem('ecotrace_draft_footprint');
    if (saved) {
      try {
        setActiveFootprint(JSON.parse(saved));
      } catch {
        setActiveFootprint(null);
      }
    } else {
      setActiveFootprint(null);
    }
  }, []);

  const loadUserData = useCallback(async (uid: string) => {
    try {
      const monthId = getCurrentMonthId();
      // Read user's monthly footprint document
      const docRef = doc(db, 'users', uid, 'footprints', monthId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setActiveFootprint(docSnap.data() as FootprintDocument);
      } else {
        loadOfflineData(); // fallback to offline edits if no cloud document yet
      }
    } catch (err) {
      console.error('Error loading cloud data:', err);
      loadOfflineData();
    }
  }, [loadOfflineData]);

  // 2. Auth State Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load data from Firestore
        await loadUserData(currentUser.uid);
      } else {
        // Load offline data from Local Storage
        loadOfflineData();
      }
    });
    return () => unsubscribe();
  }, [loadUserData, loadOfflineData]);

  // 3. Save Footprint Data callback
  const handleSaveFootprint = async (formData: FootprintDocument) => {
    setIsSaving(true);
    try {
      // Always cache in localStorage for offline compatibility
      localStorage.setItem('ecotrace_draft_footprint', JSON.stringify(formData));
      setActiveFootprint(formData);

      if (user) {
        const monthId = getCurrentMonthId();
        
        // 1. Calculate carbon weight
        const { calculateTotalFootprint } = await import('./utils/carbonCalculators');
        const totalCarbonKg = calculateTotalFootprint(formData);
        
        // Typical baseline is 220 kg
        const carbonSavedKg = Math.max(0, 220 - totalCarbonKg);

        // 2. Write details locally
        const saveLocalRef = doc(db, 'users', user.uid, 'footprints', monthId);
        await setDoc(saveLocalRef, formData, { merge: true });
        
        // 3. Call Cloud Function to sync with Secure Leaderboard
        const syncFn = httpsCallable(functions, 'syncUserFootprintAndLeaderboard');
        await syncFn({
          monthId,
          totalCarbonKg,
          carbonSavedKg
        });
        
        console.log('Online sync completed.');
      }
    } catch (err) {
      console.error('Failed to sync carbon records:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-550/10 dark:bg-[#09090b] transition-colors duration-300 flex flex-col">
      <Navbar
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode(!darkMode)}
        onAuthTrigger={() => setIsAuthModalOpen(true)}
        user={user}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 relative">
        {activeView === 'tracker' ? (
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            
            {/* Left Column: Input Form Matrices & KPIs (65%) */}
            <div className="w-full md:w-[65%] shrink-0">
              <TrackingMatrix
                initialData={activeFootprint}
                onSave={handleSaveFootprint}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSaving={isSaving}
                user={user}
              />
            </div>

            {/* Right Column: Conversational AI (35%) */}
            <div className="flex-1 md:w-[35%]">
              <EcoAgentPanel
                activeFootprint={activeFootprint}
                activeTab={activeTab}
                isMobileDrawerOpen={isMobileDrawerOpen}
                onMobileDrawerClose={() => setIsMobileDrawerOpen(false)}
              />
            </div>

          </div>
        ) : (
          <Leaderboard currentUser={user} />
        )}

        {/* Floating Chat Trigger for Mobile */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 z-30"
          aria-label="Open EcoAgent Chat"
        >
          <Bot className="w-6 h-6" />
        </button>
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
      />

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] py-4 text-center text-[10px] text-zinc-500 font-medium">
        EcoTrace India • Carbon Awareness Ecosystem • Google Cloud & Firebase Powered
      </footer>
    </div>
  );
}
