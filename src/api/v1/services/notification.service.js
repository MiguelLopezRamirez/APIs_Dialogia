// services/notification.service.js (CommonJS)
const { addDoc, serverTimestamp } = require('firebase/firestore');
const { notificationsCollection } = require('../models/notification.model');

async function createNotification(username, message, debateId) {
  if (!notificationsCollection) {
    console.error('[notify] notificationsCollection no está inicializada');
    return;
  }
  try {
    const link = `/debate/${debateId}`;
    const docRef = await addDoc(notificationsCollection, {
      username,
      message,
      datareg: serverTimestamp(),
      view: false,
      link
    });
    console.log(`[notify] creada para ${username}, id=${docRef.id}`);
  } catch (err) {
    console.error('[notify] error al crear notificación:', err);
  }
}

module.exports = { createNotification };
