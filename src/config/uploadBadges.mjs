// scripts/uploadBadgeDefinitions.js
import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";
import config from "./config.mjs";    // ajusta la ruta a tu config

// Inicializa Firebase
const firebaseConfig = {
  apiKey: config.FIREBASE_API_KEY,
  authDomain: config.FIREBASE_AUTH_DOMAIN,
  projectId: config.FIREBASE_PROJECT_ID,
  storageBucket: config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
  appId: config.FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Array plano de definiciones
const BADGE_DEFINITIONS = [
  // Insignias por creación de debates
  { badgeId: "create1",    badgeName: "Iniciador de Ideas",     description: "Creaste tu primer debate.",          xp: 5, category: "Actividad" },
  { badgeId: "create10",   badgeName: "Generador de Contenidos",description: "Has creado 10 debates.",              xp: 6, category: "Actividad" },
  { badgeId: "create50",   badgeName: "Foro Activo",            description: "Creaste 50 debates.",                 xp: 7, category: "Actividad" },
  { badgeId: "create100",  badgeName: "Voz Influyente",         description: "Creaste 100 debates.",                xp: 8, category: "Actividad" },
  // Insignias por participación en votos
  { badgeId: "vote1",      badgeName: "Voto Responsable",      description: "Emitiste tu primera votación.",        xp: 5, category: "Actividad" },
  { badgeId: "vote100",    badgeName: "Crítico Consistente",   description: "Has votado 100 veces en debates.",     xp: 6, category: "Actividad" },
  { badgeId: "vote500",    badgeName: "Balance Justo",         description: "Llegaste a 500 votos en debates.",     xp: 7, category: "Actividad" },
  { badgeId: "vote1000",   badgeName: "Maestro del Voto",      description: "Has votado 1.000 veces.",              xp: 8, category: "Actividad" },
  // Insignias por comentarios y respuestas
  { badgeId: "comment1",   badgeName: "Primer Comentario",    description: "Publicaste tu primer comentario.",     xp: 5, category: "Actividad" },
  { badgeId: "comment50",  badgeName: "Conversador Habitual", description: "Dejas 50 comentarios.",                xp: 6, category: "Actividad" },
  { badgeId: "reply20",    badgeName: "Dialoguista",          description: "Respondiste a 20 comentarios.",         xp: 7, category: "Actividad" },
  { badgeId: "reply100",   badgeName: "Interlocutor Experimentado", description: "Respondiste a 100 comentarios.", xp: 8, category: "Actividad" },
  // Insignias por ‘likes’ y ‘dislikes’
  { badgeId: "react1",     badgeName: "Opinión Personal",     description: "Diste tu primer like o dislike.",     xp: 5, category: "Actividad" },
  { badgeId: "react200",   badgeName: "Apoyo Firme",          description: "Has otorgado 200 reacciones.",         xp: 6, category: "Actividad" },
  { badgeId: "react500",   badgeName: "Pulseador Ávido",      description: "Llegaste a 500 reacciones.",           xp: 7, category: "Actividad" },
  // Insignias temáticas por categorías
  { badgeId: "catFilosofia",  badgeName: "Filósofo",           description: "Publicaste 30 debates en Filosofía.", xp: 9, category: "Filosofia" },
  { badgeId: "catReligion",   badgeName: "Teólogo",            description: "Publicaste 30 debates en Religión.",  xp: 9, category: "Religion" },
  { badgeId: "catCiencia",    badgeName: "Investigador",       description: "Publicaste 30 debates en Ciencia.",   xp: 9, category: "Ciencia" },
  { badgeId: "catDeportes",   badgeName: "Campeón Deportivo",  description: "Publicaste 30 debates en Deportes.",  xp: 9, category: "Deportes" },
  { badgeId: "catCulturaPop", badgeName: "Crítico de Cultura", description: "Publicaste 30 debates en Cultura Pop.", xp: 9, category: "Cultura Pop" },
  { badgeId: "catHistoria",   badgeName: "Cronista",           description: "Publicaste 30 debates en Historia.",  xp: 9, category: "Historia" },
  { badgeId: "catEconomia",   badgeName: "Economista",         description: "Publicaste 30 debates en Economía.",  xp: 9, category: "Economia" },
  { badgeId: "catSocial",     badgeName: "Activista Social",   description: "Publicaste 30 debates en Social.",    xp: 9, category: "Social" },
  { badgeId: "catTecnologia", badgeName: "Tecno-visionario",   description: "Publicaste 30 debates en Tecnología.",xp: 9, category: "Tecnologia" },
  { badgeId: "catPolitica",   badgeName: "Político Digital",   description: "Publicaste 30 debates en Política.",  xp: 9, category: "Politica" },
];

async function uploadBadgeDefinitions() {
  const batch = writeBatch(db);
  const collectionPath = "badgeDefinitions";

  BADGE_DEFINITIONS.forEach(def => {
    const docRef = doc(db, collectionPath, def.badgeId);
    batch.set(docRef, {
      badgeName:   def.badgeName,
      description: def.description,
      xp:          def.xp,
      category:    def.category
    });
  });

  await batch.commit();
  console.log(`✔️  Subidas ${BADGE_DEFINITIONS.length} definiciones de insignias.`);
}

uploadBadgeDefinitions().catch(err => {
  console.error("Error subiendo definiciones:", err);
  process.exit(1);
});
