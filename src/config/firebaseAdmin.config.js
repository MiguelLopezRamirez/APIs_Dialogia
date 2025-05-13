import admin from "firebase-admin";
import config from "./config.js";

// const serviceAccount = require("../../dialogia.json");
// Parsear el JSON desde la variable de entorno
const serviceAccount = JSON.parse( config.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export default admin;
