import { Sun, Moon, User, Leaf, Trophy } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  onThemeToggle: () => void;
  onAuthTrigger: () => void;
  user: any;
  activeView: 'tracker' | 'leaderboard';
  onViewChange: (view: 'tracker' | 'leaderboard') => void;
}

export default function Navbar({
  darkMode,
  onThemeToggle,
  onAuthTrigger,
  user,
  activeView,
  onViewChange,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0c0c0f]/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/20">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-zinc-950 dark:text-zinc-50">
            EcoTrace <span className="text-brand-600 dark:text-brand-500">India</span>
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2">
          <button
            onClick={() => onViewChange('tracker')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
              activeView === 'tracker'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Leaf className="w-4 h-4" />
            Tracker
          </button>
          
          <button
            onClick={() => onViewChange('leaderboard')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
              activeView === 'leaderboard'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Account Button */}
          <button
            onClick={onAuthTrigger}
            className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="max-w-[100px] truncate">
              {user ? (user.displayName || 'Account') : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
