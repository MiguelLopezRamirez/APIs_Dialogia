const { db } = require('../../../config/firebase.config');
const { collection, query, where, getDocs } = require('firebase/firestore');

// Definimos la referencia a la colección primero
const usersCollection = db ? collection(db, 'users') : null;

class User {
  constructor(uid, email, username, interests = []) {
    this.uid = uid;
    this.email = email;
    this.username = username;
    this.interests = interests;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Método para convertir a objeto plano para Firestore
  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      username: this.username,
      interests: this.interests,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Método estático para crear desde Firestore
  static fromFirestore(doc) {
    const data = doc.data();
    return new User(
      data.uid,
      data.email,
      data.username,
      data.interests || []
    );
  }

  // Método estático para buscar por username
  static async findByUsername(username) {
    if (!usersCollection) {
      throw new Error('Firestore not initialized');
    }
    
    const q = query(usersCollection, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Asumimos que username es único
    const doc = querySnapshot.docs[0];
    return this.fromFirestore(doc);
  }
}

// Exportamos la clase y la colección por separado
module.exports = {
  User,
  usersCollection
};