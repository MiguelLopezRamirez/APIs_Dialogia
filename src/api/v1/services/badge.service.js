// services/badge.service.js
import {
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  increment
} from "firebase/firestore";
import { usersCollection } from "../models/user.model";
import { badgesCollection, Badge } from "../models/badge.model";
const { Debate, debatesCollection } = require("../models/debate.model");
import { createNotification } from "./notification.service";


const BADGE_DEFINITIONS = [
  // Insignias por creación de debates
  { badgeId: "create1",    badgeName: "Iniciador de Ideas",           description: "Creaste tu primer debate.",          xp: 5,  metric: "debatesCount",        threshold: 1 },
  { badgeId: "create5",     badgeName: "Generador de Contenidos",      description: "Has creado 5 debates.",              xp: 6,  metric: "debatesCount",        threshold: 5 },
  { badgeId: "create10",    badgeName: "Foro Activo",                  description: "Creaste 10 debates.",                 xp: 7,  metric: "debatesCount",        threshold: 10 },
  { badgeId: "create20",    badgeName: "Voz Influyente",               description: "Creaste 20 debates.",                xp: 8,  metric: "debatesCount",        threshold: 20 },
  // Insignias por participación en votos
  { badgeId: "vote1",       badgeName: "Voto Responsable",             description: "Emitiste tu primera votación.",       xp: 5,  metric: "votesCount",          threshold: 1 },
  { badgeId: "vote10",      badgeName: "Crítico Consistente",          description: "Has votado 10 veces en debates.",     xp: 6,  metric: "votesCount",          threshold: 10 },
  { badgeId: "vote50",      badgeName: "Balance Justo",                description: "Llegaste a 50 votos en debates.",     xp: 7,  metric: "votesCount",          threshold: 50 },
  { badgeId: "vote100",     badgeName: "Maestro del Voto",             description: "Has votado 100 veces.",               xp: 8,  metric: "votesCount",          threshold: 100 },
  // Insignias por comentarios y respuestas
  { badgeId: "comment1",    badgeName: "Primer Comentario",            description: "Publicaste tu primer comentario.",    xp: 5,  metric: "commentsCount",       threshold: 1 },
  { badgeId: "comment10",   badgeName: "Conversador Habitual",         description: "Dejas 10 comentarios.",               xp: 6,  metric: "commentsCount",       threshold: 10 },
  { badgeId: "reply10",     badgeName: "Dialoguista",                  description: "Respondiste a 10 comentarios.",       xp: 7,  metric: "repliesCount",       threshold: 10 },
  { badgeId: "reply20",     badgeName: "Interlocutor Experimentado",   description: "Respondiste a 20 comentarios.",       xp: 8,  metric: "repliesCount",       threshold: 20 },
  // Insignias por ‘likes’ y ‘dislikes’
  { badgeId: "react1",      badgeName: "Opinión Personal",             description: "Diste tu primer like o dislike.",     xp: 5,  metric: "reactionsCount",      threshold: 1 },
  { badgeId: "react10",     badgeName: "Apoyo Firme",                  description: "Has otorgado 10 reacciones.",         xp: 6,  metric: "reactionsCount",      threshold: 10 },
  { badgeId: "react20",     badgeName: "Pulseador Ávido",              description: "Llegaste a 20 reacciones.",           xp: 7,  metric: "reactionsCount",      threshold: 20 },
  // Insignias temáticas por categorías
  { badgeId: "catFilosofia",badgeName: "Filósofo",                    description: "Publicaste 5 debates en Filosofía.",  xp: 9,  metric: "debatesByCategory",    category: "Filosofía",  threshold: 5 },
  { badgeId: "catReligion", badgeName: "Teólogo",                     description: "Publicaste 5 debates en Religión.",   xp: 9,  metric: "debatesByCategory",    category: "Religión",   threshold: 5 },
  { badgeId: "catCiencia",  badgeName: "Investigador",                description: "Publicaste 5 debates en Ciencia.",    xp: 9,  metric: "debatesByCategory",    category: "Ciencia",    threshold: 5 },
  { badgeId: "catDeportes", badgeName: "Campeón Deportivo",           description: "Publicaste 5 debates en Deportes.",   xp: 9,  metric: "debatesByCategory",    category: "Deportes",   threshold: 5 },
  { badgeId: "catCulturaPop",badgeName:"Crítico de Cultura",          description: "Publicaste 5 debates en Cultura Pop.",xp: 9,  metric: "debatesByCategory",    category: "Cultura Pop",threshold: 5 },
  { badgeId: "catHistoria", badgeName: "Cronista",                    description: "Publicaste 5 debates en Historia.",   xp: 9,  metric: "debatesByCategory",    category: "Historia",   threshold: 5 },
  { badgeId: "catEconomia", badgeName: "Economista",                  description: "Publicaste 5 debates en Economía.",   xp: 9,  metric: "debatesByCategory",    category: "Economía",   threshold: 5 },
  { badgeId: "catSocial",   badgeName: "Activista Social",            description: "Publicaste 5 debates en Social.",     xp: 9,  metric: "debatesByCategory",    category: "Social",     threshold: 5 },
  { badgeId: "catTecnologia",badgeName:"Tecno-visionario",            description: "Publicaste 5 debates en Tecnología.", xp: 9,  metric: "debatesByCategory",    category: "Tecnología", threshold: 5 },
  { badgeId: "catPolitica", badgeName: "Político Digital",            description: "Publicaste 5 debates en Política.",   xp: 9,  metric: "debatesByCategory",    category: "Política",   threshold: 5 },
];

async function checkAndAwardBadges(username) {
  // 1) Obtener userDoc…
  const userQuery    = query(usersCollection, where("username", "==", username));
  const userSnapshot = await getDocs(userQuery);
  if (userSnapshot.empty) return;
  const userDoc  = userSnapshot.docs[0];
  const userData = userDoc.data();
  const owned    = (userData.insignias || []).map(b => b.badgeId);

  // Extraer conteos de activity.interactions con valores por defecto
  const interactions = userData.activity?.interactions || {};
  const commentsCount = interactions.comments || 0;
  const repliesCount  = interactions.replies  || 0;
  const likesCount    = interactions.likes    || 0;
  const dislikesCount = interactions.dislikes || 0;
  const reactionsCount = likesCount + dislikesCount;

  // 2) Recorremos DEFINITIONS
  for (const def of BADGE_DEFINITIONS) {
    if (owned.includes(def.badgeId)) continue; 

    let meets = false;
    const { metric, threshold, category } = def;

    switch (metric) {
      case "debatesCount": {
        const snaps = await getDocs(
          query(debatesCollection, where("username", "==", username))
        );
        meets = (snaps.size >= threshold);
        break;
      }
      case "votesCount": {
        const snaps = await getDocs(debatesCollection);
        let totalVotes = 0;
        snaps.docs.forEach(docSnap => {
          const data = docSnap.data();
          const inFavor = data.peopleInFavor || [];
          const against = data.peopleAgaist || data.peopleAgainst || [];
          totalVotes += inFavor.filter(u => u === username).length;
          totalVotes += against.filter(u => u === username).length;
        });
        meets = (totalVotes >= threshold);
        break;
      }
      case "commentsCount": {
        meets = (commentsCount >= threshold);
        break;
      }
      case "repliesCount": {
        meets = (repliesCount >= threshold);
        break;
      }
      case "reactionsCount": {
        meets = (reactionsCount >= threshold);
        break;
      }
      case "debatesByCategory": {
        const snaps = await getDocs(
          query(
            debatesCollection,
            where("username", "==", username),
            where("category", "==", category)
          )
        );
        meets = (snaps.size >= threshold);
        break;
      }
      default:
        console.warn(`Métrica desconocida para ${def.badgeId}:`, metric);
    }

    if (!meets) continue;

    // 3) Otorgar insignia y XP
    await updateDoc(doc(usersCollection, userDoc.id), {
      insignias: arrayUnion({ badgeId: def.badgeId, awardedAt: new Date() }),
      "activity.score": increment(def.xp),
    });
  
    console.log(
      `🎉 Insignia otorgada: [${def.badgeId} - ${def.badgeName}] al usuario "${username}"`
    );

    // 4) Notificar
    await createNotification(
      username,
      `¡Has ganado la insignia “${def.badgeName}”! ${def.description}`
    );
  }
}

module.exports = { checkAndAwardBadges };
