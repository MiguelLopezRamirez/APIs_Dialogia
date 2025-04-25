// controllers/notification.controller.js

const { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} = require('firebase/firestore');

const { notificationsCollection } = require('../models/notification.model');

const notificationController = {
  /**
   * GET /notifications/:username
   * Devuelve las últimas 5 notificaciones del usuario, ordenadas por fecha descendente
   */
  getNotifications: async (req, res) => {
    try {
      const { username } = req.params;
      const q = query(
        notificationsCollection,
        where('username', '==', username),
        orderBy('datareg', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.status(200).json(list);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * PATCH /notifications/:idNotification
   * Marca una notificación como vista (view: true)
   */
  markAsViewed: async (req, res) => {
    try {
      const { idNotification } = req.params;
      const notifRef = doc(notificationsCollection, idNotification);
      await updateDoc(notifRef, { view: true });
      res.status(200).json({ message: 'Marcada como vista' });
    } catch (error) {
      console.error('Error al marcar notificación como vista:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * DELETE /notifications/:idNotification
   * Elimina una notificación
   */
  deleteNotification: async (req, res) => {
    try {
      const { idNotification } = req.params;
      await deleteDoc(doc(notificationsCollection, idNotification));
      res.status(200).json({ message: 'Eliminada' });
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = notificationController;
