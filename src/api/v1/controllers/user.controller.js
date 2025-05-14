const { db } = require('../../../config/firebase.config');
const { User, usersCollection } = require('../models/user.model');
const { Debate, debatesCollection,censoredCollection } = require('../models/debate.model');
const { categoriesCollection } = require('../models/category.model');
const { 
  doc, 
  getDoc, 
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  deleteDoc,
  setDoc,
  writeBatch,
  collection
} = require('firebase/firestore');


const userController = {
  // Obtener usuario por uid
  getUserByUid: async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await User.findByUid(uid);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Agregar intereses a un usuario por uid
  addUserInterests: async (req, res) => {
    try {
      const { uid } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ error: 'Interests must be a non-empty array' });
      }

      // Buscar usuario por uid
      const user = await User.findByUid(uid);
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
      const userRef = doc(usersCollection, uid);
      await updateDoc(userRef, {
        interests: arrayUnion(...validInterests),
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUid(uid);

      res.status(200).json({
        message: 'Interests added successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar todos los intereses del usuario por uid
  updateUserInterests: async (req, res) => {
    try {
      const { uid } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: 'Interests must be an array' });
      }

      // Buscar usuario por uid
      const user = await User.findByUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Si no hay intereses, simplemente actualizamos con array vacío
      if (interests.length === 0) {
        const userRef = doc(usersCollection, uid);
        await updateDoc(userRef, {
          interests: [],
          updatedAt: new Date()
        });

        const updatedUser = await User.findByUid(uid);
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
      const userRef = doc(usersCollection, uid);
      await updateDoc(userRef, {
        interests: validInterests,
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUid(uid);

      res.status(200).json({
        message: 'Interests updated successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar intereses específicos de un usuario por uid
  removeUserInterests: async (req, res) => {
    try {
      const { uid } = req.params;
      const { interests } = req.body;
      
      // Validaciones
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ error: 'Interests must be a non-empty array' });
      }

      // Buscar usuario por uid
      const user = await User.findByUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Actualizar el usuario eliminando los intereses
      const userRef = doc(usersCollection, uid);
      await updateDoc(userRef, {
        interests: arrayRemove(...interests),
        updatedAt: new Date()
      });

      // Obtener el usuario actualizado para devolverlo
      const updatedUser = await User.findByUid(uid);

      res.status(200).json({
        message: 'Interests removed successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { uid } = req.params;
      const userDoc = await getDoc(doc(usersCollection, uid));
      
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'Usuario no encontrado. ' });
      }

      const userData = userDoc.data();
      const { username, email } = userData;

      const anonymizationResult = await anonymizeUserActivity(username);
      if (!anonymizationResult.success) {
        throw new Error(anonymizationResult.error);
      }

      const usernamesCollection = collection(db, 'usernames');
      const emailsCollection = collection(db, 'emails');

      await Promise.all([
        deleteDoc(doc(usersCollection, uid)),
        deleteDoc(doc(usernamesCollection, username)), 
        deleteDoc(doc(emailsCollection, email)) 
      ]);

      res.status(200).json({
        success: true,
        message: 'Usuario eliminado completamente',
        anonymizationStats: anonymizationResult.stats
      });   

    } catch (error) {
      res.status(500).json({ 
        error: 'Error al eliminar el usuario. ',
        details: error.message 
      });
    }
  },
  activityUser: async (req, res) => {
    try {
      const { uid } = req.params;
      const userDoc = await getDoc(doc(usersCollection, uid));
      
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'Usuario no encontrado. ' });
      }
      const { username } = userDoc.data();
      const userActivity = await findUserActivity(username); 
      res.status(200).json({
        activity: userActivity
      });     

    } catch (error) {
      res.status(500).json({ 
        error: 'Error al eliminar el usuario. ',
        details: error.message 
      });
    }
  },
  getRanking: async (req, res) => {
    try {
      let  { global } = req.query; // Obtener el parámetro global (true/false)
      
      if (global === undefined) {
        global = 'true';
      }
      
      // 1. Obtener todos los usuarios
      const usersSnapshot = await getDocs(usersCollection);
      const users = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Establecer valores por defecto para campos opcionales
        const score = userData.activity?.score || 0;
        const comments = userData.activity?.interactions?.comments || 0;
        
        users.push({
          id: doc.id,
          ...userData,
          activity: {
            ...userData.activity,
            score: score,
            interactions: {
              ...userData.activity?.interactions,
              comments: comments
            }
          },
          classification: comments > 0 ? "Crítico" : "Espectador"
        });
      });
  
      // 2. Ordenar por score (descendente)
      const rankedUsers = users.sort((a, b) => b.activity.score - a.activity.score);
  
      // 3. Agregar posición en ranking
      let rankedUsersWithPosition = rankedUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  
      // 4. Filtrar según el parámetro global
      if (global !== 'true') {
        rankedUsersWithPosition = rankedUsersWithPosition.slice(0, 8); // Solo primeros 8
      }
  
      res.status(200).json(rankedUsersWithPosition);
      
    } catch (error) {
      res.status(500).json({ 
        error: "Error al obtener ranking",
        details: error.message 
      });
    }
  },
  toggleUserCensorship: async (req, res) => {
    try {
      const { uid } = req.params;
      const { censorship } = req.body;
  
      // Validación 1: Existencia de usuario
      const user = await User.findByUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Validación 2: Body correcto
      if (typeof censorship !== 'boolean') {
        return res.status(400).json({ 
          error: 'Censorship must be a boolean value (true/false)' 
        });
      }
  
      // Actualización
      const userRef = doc(usersCollection, uid);
      await updateDoc(userRef, {
        censorship,
        updatedAt: new Date()
      });
  
      // Respuesta exitosa
      const updatedUser = await User.findByUid(uid);
      res.status(200).json({
        message: `Censorship ${censorship ? 'enabled' : 'disabled'} successfully`,
        user: updatedUser
      });
  
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update censorship status',
        details: error.message 
      });
    }
  },
   // Actualiza el título (insignia usada) de un usuario
   updateUserTitle: async (req, res) => {
    try {
      const { uid } = req.params;
      const { title } = req.body;  // aquí recibimos badgeName

      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title must be a non-empty string' });
      }

      // Verificar existencia de usuario
      const user = await User.findByUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Actualizar solo el campo title
      const userRef = doc(usersCollection, uid);
      await updateDoc(userRef, {
        title,
        "activity.title": title,
        updatedAt: new Date()
      });

      // Devolver el usuario actualizado
      const updatedUser = await User.findByUid(uid);
      res.status(200).json({ message: 'Title updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating title:', error);
      res.status(500).json({ error: error.message });
    }
  },
  checkAndAwardBadgesEndpoint: async (req, res) => {
    try {
      const { uid } = req.params;
      
      // 1) Obtener el documento del usuario por UID
      const userRef = doc(usersCollection, uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userData = userSnap.data();
      const username = userData.username;
      if (!username) {
        return res.status(400).json({ error: 'Username field is missing' });
      }

      // 2) Llamar al service
      await badgeService.checkAndAwardBadges(username);

      // 3) Responder OK
      return res
        .status(200)
        .json({ message: 'Badges checked and awarded if any.' });
    } catch (err) {
      console.error('Error in checkAndAwardBadgesEndpoint:', err);
      return res.status(500).json({ error: err.message });
    }
  },
updateUserData: async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    const userRef = doc(usersCollection, uid);

    // Obtener datos actuales del usuario
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const currentData = userSnapshot.data();
    const changedFields = {};

    // Validaciones y comparación de datos
    if (updates.email !== undefined && updates.email !== currentData.email) {
      if (!isValidEmail(updates.email)) {
        return res.status(400).json({ success: false, error: 'Formato de correo inválido' });
      }
      if (!await isEmailAvailable(updates.email)) {
        return res.status(400).json({ success: false, error: 'El correo ya está en uso' });
      }
      changedFields.email = updates.email;
    }

    if (updates.username !== undefined && updates.username !== currentData.username) {
      if (!isValidUsername(updates.username)) {
        return res.status(400).json({ success: false, error: 'Nombre de usuario inválido' });
      }
      if (!await isUsernameAvailable(updates.username)) {
        return res.status(400).json({ success: false, error: 'El nombre de usuario ya está en uso' }); 
      }
      changedFields.username = updates.username;
    }

    if (updates.avatarId !== undefined && updates.avatarId !== currentData.avatarId) {
      if (!isValidAvatarId(updates.avatarId)) {
        return res.status(400).json({ success: false, error: 'ID de avatar inválido' });
      }
      changedFields.avatarId = updates.avatarId;
    }

    if (Object.keys(changedFields).length === 0) {
      return res.status(200).json({ success: true, message: "Sin cambios por hacer" });
    }


    // Actualizar en otros sistemas si es necesario
    if (changedFields.email) {
      await updateEmailInAuthSystem(uid, changedFields.email, currentData.email);
    }
    if (changedFields.username) {
      await updateUsernameInDatabase(uid, changedFields.username, currentData.username);
    }
    // Actualizar en Firestore
    await updateDoc(userRef, changedFields);

    return res.status(200).json({
      success: true,
      message: 'Datos de usuario actualizados correctamente',
      updatedFields: Object.keys(changedFields)
    });

  } catch (error) {
    console.error('Error updating user data:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}


};

const anonymizeUserActivity = async (username) => {
  if (!username || typeof username !== 'string') {
    throw new Error('Username inválido');
  }

  try {
    let stats = { debates: 0, in_favor: 0, against: 0, comments: 0 };

    // 1. Debates como CREADOR
    const createdSnapshot = await getDocs(
      query(debatesCollection, where('username', '==', username))
    );
    for (const doc of createdSnapshot.docs) {
      await updateDoc(doc.ref, { username: "usuario-eliminado" });
      stats.debates++;
    }

    // 2. Debates como PARTICIPANTE
    const [inFavorSnapshot, againstSnapshot] = await Promise.all([
      getDocs(query(debatesCollection, where('peopleInFavor', 'array-contains', username))),
      getDocs(query(debatesCollection, where('peopleAgaist', 'array-contains', username)))
    ]);

    for (const doc of inFavorSnapshot.docs) {
      await updateDoc(doc.ref, {
        peopleInFavor: arrayRemove(username)
      });
      stats.in_favor++;
    }

    for (const doc of againstSnapshot.docs) {
      await updateDoc(doc.ref, {
        peopleAgaist: arrayRemove(username)
      });
      stats.against++;
    }

    // 3. COMENTARIOS (con validación EXTRA reforzada)
    const allDebatesSnapshot = await getDocs(debatesCollection);
    for (const doc of allDebatesSnapshot.docs) {
      const debateData = doc.data();
      
      if (!debateData || 
          !debateData.comments || 
          !Array.isArray(debateData.comments) ||
          debateData.comments.length === 0
      ) {
        continue;
      }

      const comments = [...debateData.comments];

      let needsUpdate = false;
      const updatedComments = comments.map(comment => {
        if (comment?.username === username) {
          needsUpdate = true;
          return {
            ...comment, // Mantiene TODOS los campos originales
            username: "usuario-eliminado" // Solo cambia este campo
          };
        }
        return comment;
      });

      if (needsUpdate) {
        await updateDoc(doc.ref, {
          comments: updatedComments // Actualiza el array completo
        });
        stats.comments += updatedComments.filter(c => c.username === "usuario-eliminado").length;
      }
    }

    return { success: true, stats };

  } catch (error) {
    console.error(`Error crítico en anonymizeUserActivity (user: ${username}):`, {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Fallo en anonimización: ${error.message}`);
  }
};

const findUserActivity = async (username) => {
  try {
    // Consultas paralelas para mejor performance
    const [createdDebatesSnapshot, participationSnapshot, againstSnapshot, allDebatesSnapshot] = await Promise.all([
      getDocs(query(debatesCollection, where('username', '==', username))),
      getDocs(query(debatesCollection, where('peopleInFavor', 'array-contains', username))),
      getDocs(query(debatesCollection, where('peopleAgaist', 'array-contains', username))),
      getDocs(debatesCollection) // Necesario para buscar comentarios
    ]);

    // Procesar debates creados
    const createdDebates = [];
    createdDebatesSnapshot.forEach(doc => {
      createdDebates.push({
        id: doc.id,
        title: doc.data().nameDebate,
        role: 'creator'
      });
    });

    // Procesar debates donde participó (evitando duplicados)
    const favorDebates = [];
    participationSnapshot.forEach(doc => {
      if (!createdDebates.some(d => d.id === doc.id)) {
        favorDebates.push({
          id: doc.id,
          title: doc.data().nameDebate,
          role: 'in_favor'
        });
      }
    });

    // Procesar debates donde está en contra (evitando duplicados)
    const againstDebates = [];
    againstSnapshot.forEach(doc => {
      if (!createdDebates.some(d => d.id === doc.id)) {
        againstDebates.push({
          id: doc.id,
          title: doc.data().nameDebate,
          role: 'against'
        });
      }
    });

    // Procesar comentarios en todos los debates
    const userComments = [];
    allDebatesSnapshot.forEach(debateDoc => {
      const debateData = debateDoc.data();
      if (debateData.comments && debateData.comments.length > 0) {
        debateData.comments.forEach((comment, index) => {
          if (comment.username === username) {
            userComments.push({
              debateId: debateDoc.id,
              debateTitle: debateData.nameDebate,
              idComment: comment.idComment, // Índice en el array
              argument: comment.argument
            });
          }
        });
      }
    });

    return {
      success: true,
      counts: {
        created: createdDebates.length,
        in_favor: favorDebates.length,
        against: againstDebates.length,
        comments: userComments.length,
        total: createdDebates.length + favorDebates.length + againstDebates.length + userComments.length
      },
      data: {
        created: createdDebates,
        in_favor: favorDebates,
        against: againstDebates,
        comments: userComments
      }
    };

  } catch (error) {
    console.error('Error en findUserActivity:', error);
    return {
      success: false,
      error: error.message
    };
  }
};



// Funciones de validación auxiliares
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidUsername(username) {
  return username && username.length >= 3 && username.length <= 20;
}

function isValidAvatarId(avatarId) {
  return Number.isInteger(avatarId) && avatarId > 0;
}

// Funciones específicas para actualizaciones
async function updateEmailInAuthSystem(uid, newEmail, oldEmail) {
  try {
    // Primero, actualizamos el correo en Firestore
      
    const emailsCollection = collection(db, 'emails');

    await Promise.all([
      deleteDoc(doc(emailsCollection, oldEmail)),
      setDoc(doc(emailsCollection, newEmail), { uid })
    ]);
  }
  catch (error) {
    throw new Error('No se pudo actualizar el correo en el sistema de autenticación', error);
  }
  // try {
  //   await admin.auth.updateUser(uid, {
  //     email: newEmail,
  //   });
  //   return { success: true };
  // } catch (error) {
  //   console.error('Error al actualizar email en Auth:', error);
  //   throw new Error('No se pudo actualizar el correo en el sistema de autenticación');
  // }

}
const isEmailAvailable = async (newEmail) => {
  try {
    // Buscar en la colección de usuarios donde email == newEmail
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', newEmail));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty; // true si está disponible, false si ya existe
  } catch (error) {
    console.error("Error al verificar email:", error);
    throw new Error("Error al verificar disponibilidad de email");
  }
};

async function updateUsernameInDatabase(uid, newUsername, oldUsername) {
  // Implementación adicional si necesitas actualizar en otras colecciones
  // Por ejemplo, actualizar referencias en posts o comentarios

  try {
    const usernamesCollection = collection(db, 'usernames');

    await Promise.all([
      deleteDoc(doc(usernamesCollection, oldUsername)),
      setDoc(doc(usernamesCollection, newUsername), { uid }),
      updateUsernameInAllDebates(oldUsername, newUsername),
    ]);
  }catch (error) {
    console.error('Error al actualizar username en la base de datos:', error);
    throw new Error('No se pudo actualizar el nombre de usuario en la base de datos');
  }
};

const isUsernameAvailable = async (newUsername) => {
  try {
    // Buscar en la colección de usuarios donde email == newEmail
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', newUsername));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty; // true si está disponible, false si ya existe
  } catch (error) {
    console.error("Error al verificar email:", error);
    throw new Error("Error al verificar disponibilidad de email");
  }
};

 const  updateUsernameInAllDebates = async(oldUsername, newUsername) =>{
  const debatesRef = collection(db, "debates");
  const snapshot = await getDocs(debatesRef);

  let updatedCount = 0;

  for (const debateDoc of snapshot.docs) {
    const data = debateDoc.data();
    let changed = false;

    // Actualizar username en comentarios
    const updatedComments = data.comments?.map(comment => {
      if (comment.username === oldUsername) {
        changed = true;
        return { ...comment, username: newUsername };
      }
      return comment;
    });

    // Actualizar arrays de participación
    const updatedPeopleInFavor = data.peopleInFavor?.map(u => u === oldUsername ? (changed = true, newUsername) : u);
    const updatedPeopleAgaist = data.peopleAgaist?.map(u => u === oldUsername ? (changed = true, newUsername) : u);
    const updatedFollowers = data.followers?.map(u => u === oldUsername ? (changed = true, newUsername) : u);
    const updatedRefs = data.refs?.map(u => u === oldUsername ? (changed = true, newUsername) : u);

    // Actualizar username del creador del debate
    const updatedCreatorUsername = data.username === oldUsername ? newUsername : data.username;
    if (data.username === oldUsername) changed = true;

    if (changed) {
      await updateDoc(doc(db, "debates", debateDoc.id), {
        ...(updatedComments && { comments: updatedComments }),
        ...(updatedPeopleInFavor && { peopleInFavor: updatedPeopleInFavor }),
        ...(updatedPeopleAgaist && { peopleAgaist: updatedPeopleAgaist }),
        ...(updatedFollowers && { followers: updatedFollowers }),
        ...(updatedRefs && { refs: updatedRefs }),
        username: updatedCreatorUsername,
      });
      updatedCount++;
    }
  }


}


module.exports = userController;