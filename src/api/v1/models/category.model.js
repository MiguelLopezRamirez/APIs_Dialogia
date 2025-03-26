const { db } = require('../../../config/firebase.config');
const { collection } = require('firebase/firestore');
class Category {
  constructor(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.createdAt = new Date();
  }

  // Método para convertir a objeto plano para Firestore
  toFirestore() {
    return {
      name: this.name,
      description: this.description,
      createdAt: this.createdAt
    };
  }

  // Método estático para crear desde Firestore
  static fromFirestore(doc) {
    const data = doc.data();
    return new Category(
      doc.id,
      data.name,
      data.description
    );
  }
}

// Exportamos tanto la clase como la referencia a la colección
module.exports = {
  Category,
  categoriesCollection: db ? collection(db, 'categories') : null
};