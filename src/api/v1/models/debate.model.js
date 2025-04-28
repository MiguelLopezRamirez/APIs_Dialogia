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
    this.peopleInFavor = [username];
    this.peopleAgaist = [];
    this.moderationStatus = 'PENDING'; // PENDING, APPROVED, CENSORED, DELETED
    this.moderationReason = '';
    this.followers = [];
  }

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
      peopleAgaist: this.peopleAgaist,
      moderationStatus: this.moderationStatus,
      moderationReason: this.moderationReason,
      followers: this.followers
    };
  }

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
    
    debate.datareg = data.datareg?.toDate?.() || new Date();
    debate.comments = data.comments || [];
    debate.popularity = data.popularity || 0;
    debate.peopleInFavor = data.peopleInFavor || [data.username];
    debate.peopleAgaist = data.peopleAgaist || [];
    debate.moderationStatus = data.moderationStatus || 'APPROVED';
    debate.moderationReason = data.moderationReason || '';
    debate.followers = data.followers || [];  

    return debate;
  }

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
      peopleAgaist: this.peopleAgaist,
      moderationStatus: this.moderationStatus,
      moderationReason: this.moderationReason,
      followers: this.followers
    };
  }
}

// Exportar también la colección de censura
const censoredCollection = db ? collection(db, 'censoredContent') : null;

module.exports = {
  Debate,
  debatesCollection: db ? collection(db, 'debates') : null,
  censoredCollection
};