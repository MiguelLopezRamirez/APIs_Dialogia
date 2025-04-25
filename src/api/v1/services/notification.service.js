// services/notification.service.js (CommonJS)
const { addDoc, serverTimestamp } = require('firebase/firestore');
const { notificationsCollection } = require('../models/notification.model');

async function createNotification(username, message) {
  if (!notificationsCollection) {
    console.error('[notify] notificationsCollection no está inicializada');
    return;
  }
  try {
    const docRef = await addDoc(notificationsCollection, {
      username,
      message,
      datareg: serverTimestamp(),
      view: false
    });
    console.log(`[notify] creada para ${username}, id=${docRef.id}`);
  } catch (err) {
    console.error('[notify] error al crear notificación:', err);
  }
}

module.exports = { createNotification };
