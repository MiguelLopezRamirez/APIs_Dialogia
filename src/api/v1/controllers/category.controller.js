const { Category, categoriesCollection } = require('../models/category.model');
const { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} = require('firebase/firestore');

const categoryController = {
  // Crear categoría
  createCategory: async (req, res) => {
    try {
      const { id, name, description, image, background ,order } = req.body;
      
      // Validaciones
      if (!id || !name) {
        return res.status(400).json({ error: 'ID and name are required' });
      }

      // Verificar si ya existe
      const docRef = doc(categoriesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return res.status(409).json({ error: 'Category ID already exists' });
      }

      // Crear nueva categoría
      const newCategory = new Category(id, name, description, image, background, order);
      await setDoc(docRef, newCategory.toFirestore());

      res.status(201).json({
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        image: newCategory.image,
        background: newCategory.background,
        order: newCategory.order
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener todas las categorías
  getAllCategories: async (req, res) => {
    try {
      const querySnapshot = await getDocs(categoriesCollection);
      const categories = querySnapshot.docs.map(doc => 
        Category.fromFirestore(doc)
      );
      
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener categoría por ID
  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = doc(categoriesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      const category = Category.fromFirestore(docSnap);
      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar categoría
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, image, background, order } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const docRef = doc(categoriesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      await updateDoc(docRef, { 
        name, 
        description: description || null,
        image: image || null,
        background: background || null,
        order: order || null
      });
      
      res.status(200).json({ 
        id, 
        name, 
        description,
        image,
        order
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar categoría
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = doc(categoriesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      await deleteDoc(docRef);
      res.status(200).json({ 
        id, 
        deleted: true,
        message: 'Category deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

// Search categories by name (case-insensitive)
searchCategories: async (req, res) => {
    try {
      let { name } = req.query;
      
      if (!name) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      // Convert search term to uppercase
      name = name.toUpperCase();
      
      const q = query(
        categoriesCollection, 
        where('name', '>=', name),
        where('name', '<=', name + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      const categories = querySnapshot.docs
        .map(doc => Category.fromFirestore(doc))
        .filter(category => category.name.toUpperCase().includes(name)); // Ensure exact match ignoring case
      
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }, 

// Insert multiple categories at once
insertCategories: async (req, res) => {
    try {
      const { categories } = req.body;
  
      // Validate input
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ error: 'A non-empty array of categories is required' });
      }
  
      const insertedCategories = [];
  
      for (const category of categories) {1
        if (!category.idCategory || !category.name || !category.description ||!category.image ||!category.background ||!category.order) {
          return res.status(400).json({ error: 'Each category must have idCategory, name, and description' });
        }
  
        const categoryRef = doc(categoriesCollection, category.idCategory);
  
        await setDoc(categoryRef, {
          idCategory: category.idCategory,
          name: category.name, 
          description: category.description,
          image: category.image,
          background: category.background,
          order: category.order
        });
  
        insertedCategories.push(category.idCategory);
      }
  
      res.status(201).json({
        message: 'Categories inserted successfully',
        inserted: insertedCategories
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  
};



module.exports = categoryController;