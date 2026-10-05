// Konfigurasi Firebase web (identifier publik, keamanan diatur lewat Firestore Rules).
// Bisa di-override via env VITE_FIREBASE_CONFIG (JSON satu baris) di Vercel.
const defaultConfig = {
  apiKey: 'AIzaSyBW8KkPG9xCbDJx9z--IORaTigAWMA_2Qg',
  authDomain: 'hk-hub-station.firebaseapp.com',
  projectId: 'hk-hub-station',
  storageBucket: 'hk-hub-station.firebasestorage.app',
  messagingSenderId: '946732219295',
  appId: '1:946732219295:web:a4a2279f2359bce2635baa',
};

export const firebaseConfig = (() => {
  try {
    const env = import.meta.env.VITE_FIREBASE_CONFIG;
    return env ? JSON.parse(env) : defaultConfig;
  } catch {
    return defaultConfig;
  }
})();
