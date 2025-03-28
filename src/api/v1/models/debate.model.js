const { db } = require('../../../config/firebase.config');
const { collection, serverTimestamp } = require('firebase/firestore');

class Debate {
  constructor(idDebate, nameDebate, argument, category, username, refs = [], image = '') {
    this.idDebate = idDebate;
    this.nameDebate = nameDebate;
    this.argument = argument;
    this.category = category;
    this.datareg = serverTimestamp();
    this.username = username;
    this.image = image;
    this.refs = refs;
    this.comments = [];
    this.popularity = 0;
    this.peopleInFavor = [username]; // El creador automáticamente está a favor
    this.peopleAgaist = [];
  }

  // Método para convertir a objeto plano para Firestore
  toFirestore() {
    return {
      nameDebate: this.nameDebate,
      argument: this.argument,
      category: this.category,
      datareg: this.datareg,
      username: this.username,
      image: this.image,
      refs: this.refs,
      comments: this.comments,
      popularity: this.popularity,
      peopleInFavor: this.peopleInFavor,
      peopleAgaist: this.peopleAgaist
    };
  }

  // Método estático para crear desde Firestore
  static fromFirestore(doc) {
    const data = doc.data();
    const debate = new Debate(
      doc.id,
      data.nameDebate,
      data.argument,
      data.category,
      data.username,
      data.refs || [],
      data.image || ''
    );
    
    // Manejo especial de campos que pueden cambiar después de la creación
    debate.datareg = data.datareg?.toDate?.() || new Date();
    debate.comments = data.comments || [];
    debate.popularity = data.popularity || 0;
    debate.peopleInFavor = data.peopleInFavor || [data.username];
    debate.peopleAgaist = data.peopleAgaist || [];
    
    return debate;
  }

  // Método para convertir a objeto JSON (útil para respuestas API)
  toJSON() {
    return {
      idDebate: this.idDebate,
      nameDebate: this.nameDebate,
      argument: this.argument,
      category: this.category,
      datareg: this.datareg instanceof Date ? this.datareg.toISOString() : new Date().toISOString(),
      username: this.username,
      image: this.image,
      refs: this.refs,
      comments: this.comments,
      popularity: this.popularity,
      peopleInFavor: this.peopleInFavor,
      peopleAgaist: this.peopleAgaist
    };
  }
}

// Exportamos tanto la clase como la referencia a la colección
module.exports = {
  Debate,
  debatesCollection: db ? collection(db, 'debates') : null
};