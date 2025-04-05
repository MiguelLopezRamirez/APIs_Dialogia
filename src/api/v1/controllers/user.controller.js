const { User, usersCollection } = require('../models/user.model');
const { categoriesCollection } = require('../models/category.model');
const { 
  doc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove
} = require('firebase/firestore');

const userController = {
  // Obtener usuario por username
  getUserByUsername: async (req, res) => {
    try {
      const { username } = req.params;
      const user = await User.findByUsername(username);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Agregar intereses a un usuario por username
  addUserInterests: async (req, res) => {
    try {
      const { username } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ error: 'Interests must be a non-empty array' });
      }

      // Buscar usuario por username
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verificar que todas las categorías de intereses existen
      const invalidInterests = [];
      const validInterests = [];

      for (const interestId of interests) {
        const categoryRef = doc(categoriesCollection, interestId);
        const categorySnap = await getDoc(categoryRef);
        
        if (categorySnap.exists()) {
          validInterests.push(interestId);
        } else {
          invalidInterests.push(interestId);
        }
      }

      if (invalidInterests.length > 0) {
        return res.status(400).json({ 
          error: 'Some interests are invalid', 
          invalidInterests,
          validInterests
        });
      }

      // Actualizar el usuario
      const userRef = doc(usersCollection, user.uid);
      await updateDoc(userRef, {
        interests: arrayUnion(...validInterests),
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUsername(username);

      res.status(200).json({
        message: 'Interests added successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar todos los intereses del usuario por username
  updateUserInterests: async (req, res) => {
    try {
      const { username } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: 'Interests must be an array' });
      }

      // Buscar usuario por username
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Si no hay intereses, simplemente actualizamos con array vacío
      if (interests.length === 0) {
        const userRef = doc(usersCollection, user.uid);
        await updateDoc(userRef, {
          interests: [],
          updatedAt: new Date()
        });

        const updatedUser = await User.findByUsername(username);
        return res.status(200).json({
          message: 'Interests updated successfully (empty)',
          user: updatedUser
        });
      }

      // Verificar que todas las categorías de intereses existen
      const invalidInterests = [];
      const validInterests = [];

      for (const interestId of interests) {
        const categoryRef = doc(categoriesCollection, interestId);
        const categorySnap = await getDoc(categoryRef);
        
        if (categorySnap.exists()) {
          validInterests.push(interestId);
        } else {
          invalidInterests.push(interestId);
        }
      }

      if (invalidInterests.length > 0) {
        return res.status(400).json({ 
          error: 'Some interests are invalid', 
          invalidInterests,
          validInterests
        });
      }

      // Actualizar el usuario con los nuevos intereses
      const userRef = doc(usersCollection, user.uid);
      await updateDoc(userRef, {
        interests: validInterests,
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUsername(username);

      res.status(200).json({
        message: 'Interests updated successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar intereses específicos de un usuario por username
  removeUserInterests: async (req, res) => {
    try {
      const { username } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ error: 'Interests must be a non-empty array' });
      }

      // Buscar usuario por username
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Actualizar el usuario eliminando los intereses
      const userRef = doc(usersCollection, user.uid);
      await updateDoc(userRef, {
        interests: arrayRemove(...interests),
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUsername(username);

      res.status(200).json({
        message: 'Interests removed successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = userController;