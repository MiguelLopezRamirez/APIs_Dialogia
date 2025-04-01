const { db } = require('../../../config/firebase.config');
const { collection } = require('firebase/firestore');
class Category {
  constructor(id, name, description, image, background ,order) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.image = image;
    this.background = background;
    this.order = order;
    this.createdAt = new Date();
  }

  // Método para convertir a objeto plano para Firestore
  toFirestore() {
    return {
      name: this.name,
      description: this.description,
      image: this.image,
      background: this.background,
      order: this.order,
      createdAt: this.createdAt
    };
  }

  // Método estático para crear desde Firestore
  static fromFirestore(doc) {
    const data = doc.data();
    return new Category(
      doc.id,
      data.name,
      data.description,
      data.image,
      data.background,
      data.order
    );
  }
}

// Exportamos tanto la clase como la referencia a la colección
module.exports = {
  Category,
  categoriesCollection: db ? collection(db, 'categories') : null
};