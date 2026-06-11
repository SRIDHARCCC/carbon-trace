import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "project_id.firebaseapp.com",
  projectId: "project_id",
  storageBucket: "project_id.firebasestorage.app",
  messagingSenderId: "1023894940612",
  appId: "1:1023894940612:web:697b0fd2126115cd851291"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-south1'); // Set to Mumbai/Delhi region close to India

// Connect to emulators if explicitly requested via query parameter ?emulator=true
// or via Vite environment variable
const useEmulators = import.meta.env.DEV && (
  new URLSearchParams(window.location.search).get('emulator') === 'true' ||
  import.meta.env.VITE_USE_EMULATORS === 'true'
);

if (useEmulators) {
  console.log('Connecting to Firebase Local Emulators...');
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (e) {
    console.warn('Firebase Emulators connection failed or already connected:', e);
  }
}
