import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import config from './config';

console.log('Configuración de Firebase:', config); // Verifica que las credenciales se carguen correctamente

const firebaseConfig = {
  apiKey: config.FIREBASE_API_KEY,
  authDomain: config.FIREBASE_AUTH_DOMAIN,
  projectId: config.FIREBASE_PROJECT_ID,
  storageBucket: config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
  appId: config.FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('Firebase inicializado correctamente'); // Verifica que Firebase se inicialice

export { auth };