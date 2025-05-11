import { initializeApp } from "firebase/app";
const { getFirestore } = require("firebase/firestore");
import config from "./config.js";

console.log("Configuración de Firebase:", config); // Verifica que las credenciales se carguen correctamente

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
const db = getFirestore(app);

console.log("Firebase inicializado correctamente"); // Verifica que Firebase se inicialice

export { db };
