const { db } = require('../../../config/firebase.config');
const { collection } = require('firebase/firestore');

class Notification {
  constructor(idNotification, username, datareg, message, view = false) {
    this.idNotification = idNotification;
    this.username = username;
    this.datareg = datareg;
    this.message = message;
    this.view = view;
  }
  toFirestore() {
    return {
      username: this.username,
      datareg: this.datareg,
      message: this.message,
      view: this.view
    };
  }
}

const notificationsCollection = db
  ? collection(db, 'notifications')
  : null;

module.exports = { Notification, notificationsCollection };
