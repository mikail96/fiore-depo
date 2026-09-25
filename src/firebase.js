import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

const emulator = !!import.meta.env.VITE_EMULATOR;
export const ayarEksik = !emulator && String(firebaseConfig.apiKey || '').startsWith('BURAYA');

const config = emulator || ayarEksik
  ? { apiKey: 'demo-key', authDomain: 'demo-fiore.firebaseapp.com', projectId: 'demo-fiore', appId: 'demo-app' }
  : firebaseConfig;

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

if (emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
