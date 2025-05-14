import dotenv from 'dotenv';
dotenv.config();

export default {
  HOST: process.env.HOST || '<<ERROR>> NO ENCONTRE EL HOST',
  PORT: process.env.PORT || '<<ERROR>> NO ENCONTRE EL PORT',
  API_URL: process.env.API_URL || '/api/v1',

  // Configuración de Firebase
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '<<ERROR>> NO SE ENCUENTRA',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '<<ERROR>> NO SE ENCUENTRA',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '<<ERROR>> NO SE ENCUENTRA',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '<<ERROR>> NO SE ENCUENTRA',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '<<ERROR>> NO SE ENCUENTRA',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '<<ERROR>> NO SE ENCUENTRA'
};