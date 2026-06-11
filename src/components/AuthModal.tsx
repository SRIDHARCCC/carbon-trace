import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LogIn, UserPlus, X, LogOut, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const inputClassName = "w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-950 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500";

export default function AuthModal({ isOpen, onClose, user }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your name.');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const currentUser = userCredential.user;
        
        // Update profile name
        await updateProfile(currentUser, { displayName: name });
        
        // Initialize user record in Firestore
        await setDoc(doc(db, 'users', currentUser.uid), {
          name,
          email,
          city,
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
      // Clear forms
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } catch {
      setError('Failed to log out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0c0c0f] rounded-[12px] border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md p-6 relative overflow-hidden transition-all">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          <div className="text-center py-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
              Signed In As
            </h2>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-1">
              {user.displayName || 'Eco Tracer'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mb-6">
              {user.email}
            </p>
            
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-[8px] px-[16px] py-[10px] font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-6 flex items-center gap-2">
              {isSignUp ? <UserPlus className="w-5 h-5 text-brand-500" /> : <LogIn className="w-5 h-5 text-brand-500" />}
              {isSignUp ? 'Create an Account' : 'Sign In to EcoTrace'}
            </h2>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-800 dark:text-rose-300 rounded-lg p-3 flex gap-2 text-xs mb-4 items-start">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Full Name</label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      placeholder="Sridhar Chandrasekaran"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-city" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">City / Region</label>
                    <select
                      id="auth-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="Bengaluru">Bengaluru (BESCOM)</option>
                      <option value="Mumbai">Mumbai (MSEB)</option>
                      <option value="Chennai">Chennai (TNEB)</option>
                      <option value="Kolkata">Kolkata (WBSEDCL)</option>
                      <option value="Delhi">Delhi (Other)</option>
                      <option value="Pune">Pune (MSEB)</option>
                      <option value="Other">Other / National Avg</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-[8px] px-[16px] py-[10px] font-medium transition-colors shadow-sm disabled:opacity-50 mt-6"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline bg-transparent border-transparent shadow-none"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
