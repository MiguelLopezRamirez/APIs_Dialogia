const { db } = require('../../../config/firebase.config');
const { collection, query, where, getDocs, getDoc, doc } = require('firebase/firestore');

// Definimos la referencia a la colección primero
const usersCollection = db ? collection(db, 'users') : null;

class User {
  constructor(uid, email, username, interests = [], censorship, insignias = [], title, avatarId) {
    this.uid = uid;
    this.email = email;
    this.username = username;
    this.interests = interests;
    this.censorship = censorship;
    this.insignias = insignias;
    this.title = title;
    this.avatarId = avatarId;
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
      censorship: this.censorship,
      insignias: this.insignias,
      title: this.title,
      avatarId: this.avatarId,
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
      data.interests || [],
      data.censorship,
      data.insignias || [], 
      data.title || "",
      data.avatarId || 1,
    );
  }

  // Método estático para buscar por uid
  static async findByUid(uid) {
    if (!usersCollection) {
      throw new Error('Firestore not initialized');
    }
    
    const userRef = doc(usersCollection, uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return this.fromFirestore(userSnap);
  }
}

// Exportamos la clase y la colección por separado
module.exports = {
  User,
  usersCollection
};