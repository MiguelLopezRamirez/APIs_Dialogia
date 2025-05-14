const { Debate, debatesCollection,censoredCollection } = require('../models/debate.model');
const geminiService = require('../services/gemini.service');
const { createNotification } = require('../services/notification.service');
const { Category, categoriesCollection } = require('../models/category.model');
const { User, usersCollection } = require('../models/user.model');
const { checkAndAwardBadges } = require('../services/badge.service');

const {addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} = require('firebase/firestore');

async function logCensoredContent({ type, contentId, debateId, commentId, content, username, reason, categories }) {
  if (!censoredCollection) return;
  
  const censoredDoc = {
    type,
    contentId,
    debateId: type === 'COMMENT' ? debateId : null,
    originalContent: content,
    username,
    reason,
    categories,
    timestamp: serverTimestamp()
  };
  
  await addDoc(censoredCollection, censoredDoc);
}
const debateController = {
  // Crear debate
  createDebate: async (req, res) => {
    try {
      const { nameDebate, argument, category, username, refs = [], image = '' } = req.body;
      
      // Validaciones
      if (!nameDebate || !argument || !category || !username) {
        return res.status(400).json({ error: 'Nombre, argumento, categoría y usuario son requeridos' });
      }
  
      // Verificar categoría
      const categoryRef = doc(categoriesCollection, category);
      const categorySnap = await getDoc(categoryRef);
      
      if (!categorySnap.exists()) {
        return res.status(400).json({ error: 'La categoría no existe' });
      }
  
      // Moderar contenido con Gemini
      const contentToModerate = `${nameDebate}\n\n${argument}`;
      const moderationResult = await geminiService.moderateContent(contentToModerate);
      
      // Manejar decisiones de moderación
      if (moderationResult.decision === 'ELIMINADO') {
        return res.status(403).json({ 
          error: 'El contenido viola nuestras normas',
          reason: moderationResult.reason,
          categories: moderationResult.flaggedCategories
        });
      }
  
      // Crear debate
      const newDebateRef = doc(debatesCollection);
      const newDebate = new Debate(
        newDebateRef.id,
        nameDebate,
        argument,
        category,
        username,
        refs,
        image
      );
  
      // Aplicar estado de moderación
      if (moderationResult.decision === 'CENSURADO') {
        newDebate.moderationStatus = 'CENSORED';
        newDebate.moderationReason = moderationResult.reason;
        
        // Registrar en colección de censura
        await logCensoredContent({
          type: 'DEBATE',
          contentId: newDebateRef.id,
          content: contentToModerate,
          username,
          reason: moderationResult.reason,
          categories: moderationResult.flaggedCategories
        });
      } else {
        newDebate.moderationStatus = 'APPROVED';
      }
  
      await setDoc(newDebateRef, newDebate.toFirestore());
      
      //Auto-follow
      await updateDoc(newDebateRef, {
        followers: arrayUnion(username),
      });

      // Obtener debate creado
      const createdDebateSnap = await getDoc(newDebateRef);
      const createdDebate = Debate.fromFirestore(createdDebateSnap);
  
      // Registrar interacción de comentar en la actividad del usuario 
      try {
        // 1. Obtener el documento del usuario en Firestore
        const userQuery = query(usersCollection, where("username", "==", username));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
            console.warn(`Usuario ${username} no encontrado para actualizar actividad`);
        } else {
            // 2. Actualizar los campos de actividad
            const userDoc = userSnapshot.docs[0];
            await updateDoc(userDoc.ref, {
                "activity.content.created": increment(1),
                "activity.score": increment(5), 
                "updatedAt": new Date() 
            });
            await checkAndAwardBadges(username);
            // 3. Opcional: Actualizar tags/categoría si es relevante para el debate
            if (category) {
                const categoryField = `activity.tags.${category}`;
                await updateDoc(userDoc.ref, {
                    [categoryField]: increment(1)
                });
            }
        }
      } catch (userUpdateError) {
          console.error("Error al actualizar actividad del usuario:", userUpdateError);
      }

      res.status(201).json(createdDebate.toJSON());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }, 

  createDebates: async(req, res) =>{
    try {
      const debatesData = req.body; // Array de debates
  
      // Validar que sea un array
      if (!Array.isArray(debatesData)) {
        return res.status(400).json({ error: 'Se esperaba un array de debates' });
      }
  
      // Validar que la colección de debates esté disponible
      if (!debatesCollection) {
        return res.status(500).json({ error: 'Error de configuración de Firestore' });
      }
  
      // Preparar batch de operaciones
      const batch = writeBatch(debatesCollection.firestore);
      const createdDebates = [];
  
      for (const debateData of debatesData) {
        const { nameDebate, argument, category, username, refs = [], image = '' } = debateData;
  
        // Validaciones básicas
        if (!nameDebate || !argument || !category || !username) {
          return res.status(400).json({ 
            error: `Debate inválido: Nombre, argumento, categoría y usuario son requeridos para el debate: ${nameDebate || 'sin nombre'}` 
          });
        }
  
        // Verificar categoría (si categoriesCollection está disponible)
        if (categoriesCollection) {
          const categoryRef = doc(categoriesCollection, category);
          const categorySnap = await getDoc(categoryRef);
          
          if (!categorySnap.exists()) {
            return res.status(400).json({ 
              error: `La categoría ${category} no existe para el debate: ${nameDebate}` 
            });
          }
        }
  
        // Crear ID del debate (usar el proporcionado o generar uno nuevo)
        const debateId = debateData.idDebate || doc(debatesCollection).id;
  
        // Crear instancia del debate
        const newDebate = new Debate(
          debateId,
          nameDebate,
          argument,
          category,
          username,
          refs,
          image
        );
  
        // Asignar campos adicionales si existen en los datos
        if (debateData.comments) newDebate.comments = debateData.comments;
        if (debateData.popularity) newDebate.popularity = debateData.popularity;
        if (debateData.peopleInFavor) newDebate.peopleInFavor = debateData.peopleInFavor;
        if (debateData.peopleAgaist) newDebate.peopleAgaist = debateData.peopleAgaist;
        if (debateData.datareg) newDebate.datareg = new Date(debateData.datareg);
  
        // Añadir operación al batch
        const debateRef = doc(debatesCollection, debateId);
        batch.set(debateRef, newDebate.toFirestore());
        
        batch.update(debateRef, {
          followers: arrayUnion(username)
        });

        createdDebates.push(newDebate);
      }
  
      // Ejecutar todas las operaciones
      await batch.commit();
  
      // Preparar respuesta
      res.status(201).json(createdDebates.map(d => d.toJSON()));
    } catch (error) {
      console.error('Error creating debates:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener todos los debates
getAllDebates: async (req, res) => {
  try {
    const querySnapshot = await getDocs(debatesCollection);
    const debatesData = querySnapshot.docs.map(doc => {
      return Debate.fromFirestore(doc);
    });

    // Obtener IDs únicos de categorías
    const categoryIds = [...new Set(debatesData.map(debate => debate.category))];

    // Buscar todas las categorías en paralelo
    const categoryPromises = categoryIds.map(id => getDoc(doc(categoriesCollection, id)));
    const categorySnapshots = await Promise.all(categoryPromises);

    // Crear mapa de ID a nombre
    const categoryMap = {};
    categorySnapshots.forEach(snap => {
      if (snap.exists()) {
        const category = Category.fromFirestore(snap);
        categoryMap[snap.id] = category.name;
      }
    });

    // Reemplazar IDs con nombres
    const debates = debatesData.map(debate => {
      const json = debate.toJSON();
      json.category = categoryMap[debate.category] || null;
      return json;
    });
    res.status(200).json(debates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},

// Endpoint para actualizar likes o dislikes de un comentario
likesAndDislikes: async (req, res) => {
  const { id, idComment } = req.params;
  const { action, method, username } = req.body; // action: "like" o "dislike", method: "add" o "remove"

  if (!['like', 'dislike'].includes(action) || !['add', 'remove'].includes(method)) {
    return res.status(400).json({ error: 'Acción o método inválido' });
  }

  try {
    // 1) Obtén debate
    const debateRef = doc(debatesCollection, id);
    const debateSnap = await getDoc(debateRef);
    if (!debateSnap.exists()) {
      return res.status(404).json({ error: 'Debate no encontrado' });
    }
    const debateData = debateSnap.data();

    // 2) Busca comentario
    const idx = debateData.comments.findIndex(c => c.idComment === idComment);
    if (idx === -1) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }
    const comment = debateData.comments[idx];

    // 3) Inicializa contadores y arrays si faltan
    comment.likes    = comment.likes    || 0;
    comment.dislikes = comment.dislikes || 0;
    comment.peopleInFavor   = comment.peopleInFavor   || [];
    comment.peopleAgainst = comment.peopleAgainst || [];

    // 4) Lógica de like / dislike
    if (action === 'like') {
      // Ajusta contador
      comment.likes = method === 'add'
        ? comment.likes + 1
        : Math.max(comment.likes - 1, 0);

      if (method === 'add') {
        // Añade usuario a peopleInFavor y lo quita de peopleAgainst
        if (!comment.peopleInFavor.includes(username)) {
          comment.peopleInFavor.push(username);
        }
        comment.peopleAgainst = comment.peopleAgainst.filter(u => u !== username);
      } else {
        // Quitar usuario de peopleInFavor
        comment.peopleInFavor = comment.peopleInFavor.filter(u => u !== username);
      }

      // Actualiza actividad de usuario
      try {
        const userQ = query(usersCollection, where("username", "==", username));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          const upd = { updatedAt: new Date() };
          if (method === 'add') {
            upd["activity.interactions.likes"] = increment(1);
            upd["activity.score"] = increment(1);
          } else {
            upd["activity.interactions.likes"] = increment(-1);
            upd["activity.score"] = increment(-1);
          }
          await updateDoc(userDoc.ref, upd);
          await checkAndAwardBadges(username);
        }
      } catch (err) {
        console.error("Error al actualizar actividad (like):", err);
      }

    } else if (action === 'dislike') {
      // Ajusta contador
      comment.dislikes = method === 'add'
        ? comment.dislikes + 1
        : Math.max(comment.dislikes - 1, 0);

      if (method === 'add') {
        // Añade usuario a peopleAgainst y lo quita de peopleInFavor
        if (!comment.peopleAgainst.includes(username)) {
          comment.peopleAgainst.push(username);
        }
        comment.peopleInFavor = comment.peopleInFavor.filter(u => u !== username);
      } else {
        // Quitar usuario de peopleAgainst
        comment.peopleAgainst = comment.peopleAgainst.filter(u => u !== username);
      }

      // Actualiza actividad de usuario
      try {
        const userQ = query(usersCollection, where("username", "==", username));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          const upd = { updatedAt: new Date() };
          if (method === 'add') {
            upd["activity.interactions.dislikes"] = increment(1);
            upd["activity.score"] = increment(0.5);
          } else {
            upd["activity.interactions.dislikes"] = increment(-1);
            upd["activity.score"] = increment(-0.5);
          }
          await updateDoc(userDoc.ref, upd);
        }
      } catch (err) {
        console.error("Error al actualizar actividad (dislike):", err);
      }
    }

    // 5) Guarda cambios en Firestore y responde
    await updateDoc(debateRef, { comments: debateData.comments });
    res.json(comment);

  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
},

// Obtener debate por ID
getDebateById: async (req, res) => {
  try {
    const { id } = req.params;
    const { censored = 'true'} = req.query;
    const { username } = req.body;
    const docRef = doc(debatesCollection, id);
    const docSnap = await getDoc(docRef);      
    
    // Convertir showCensored a booleano
    let showCensoredContent;
    if (censored === 'true'){
      showCensoredContent = false;
    }else{
      showCensoredContent = true;
    }
    
    
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Debate no encontrado' });
    }
    
    const debate = Debate.fromFirestore(docSnap);

    // Aplicar filtro de censura a los comentarios
    if(!showCensoredContent){
      if (debate.comments && debate.comments.length > 0) {
        debate.comments = debate.comments.filter(comment => 
          comment.moderationStatus === 'APPROVED'
        );
      }
    }

    const q = query(usersCollection, where('username', '==', debate.username));
    const querySnapshot = await getDocs(q);
    let user;
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      user = User.fromFirestore(userDoc); // Asegúrate que User.fromFirestore esté funcionando
    }

    // Cargar datos de usuario en cada comentario
     
    if (Array.isArray(debate.comments)) {
      for (const comment of debate.comments) {
        if (comment.username) {
          const q = query(usersCollection, where('username', '==', comment.username));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const user = User.fromFirestore(userDoc);
            comment.user = user; // Guardar datos completos del usuario
          } else {
            comment.user = null;
          }
        }
      }
    }

    // Obtener nombre de la categoría
    const categoryRef = doc(categoriesCollection, debate.category);
    const categorySnap = await getDoc(categoryRef);
    
    if (categorySnap.exists()) {
      const category = Category.fromFirestore(categorySnap);
      debate.category = category.name;
    } else {
      debate.category = null; // o mantener el ID si prefieres
    }

    const responseData = debate.toJSON();
    responseData.bestArgument = getBestArgument(debate.comments);
    responseData.user = user;
    // Registrar interacción de comentar en la actividad del usuario 
    if (username) {
      try {
        // 1. Obtener el documento del usuario en Firestore
        const userQuery = query(usersCollection, where("username", "==", username));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
            console.warn(`Usuario ${username} no encontrado para actualizar actividad`);
        } else {
            // 2. Actualizar los campos de actividad
            const userDoc = userSnapshot.docs[0];
            await updateDoc(userDoc.ref, {
                "activity.content.views": increment(1),
                //"activity.score": increment(0.05), 
                "updatedAt": new Date() // Actualizar marca de tiempo
            });
        }
      } catch (userUpdateError) {
          console.error("Error al actualizar actividad del usuario:", userUpdateError);
      }    
    }

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},

  // Actualizar debate (PATCH para actualizaciones parciales)
  updateDebate: async (req, res) => {
    try {
      const { id } = req.params;
      const { nameDebate, argument, category, image, refs } = req.body;
     
      const docRef = doc(debatesCollection, id);
      const docSnap = await getDoc(docRef);
     
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Debate no encontrado' });
      }

      const updates = {};
      if (nameDebate) updates.nameDebate = nameDebate;
      if (argument) updates.argument = argument;
      if (category) {
        // Verificar que la nueva categoría exista
        const categoryRef = doc(categoriesCollection, category);
        const categorySnap = await getDoc(categoryRef);
       
        if (!categorySnap.exists()) {
          return res.status(400).json({ error: 'La categoría no existe' });
        }
        updates.category = category;
      }
      if (image !== undefined) updates.image = image;
      if (refs !== undefined) updates.refs = refs;

      await updateDoc(docRef, updates);

      const updatedDebateSnap = await getDoc(docRef);
      const updatedDebate = Debate.fromFirestore(updatedDebateSnap);
     
      res.status(200).json(updatedDebate.toJSON());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar debate
  deleteDebate: async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = doc(debatesCollection, id);
      const docSnap = await getDoc(docRef);
     
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Debate no encontrado' });
      }
     
      await deleteDoc(docRef);
      res.status(200).json({
        id,
        deleted: true,
        message: 'Debate eliminado correctamente'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

// Añadir comentario a un debate (método completo actualizado)
addComment: async (req, res) => {
  try {

    const { id } = req.params;                  // idDebate
    const { username, argument, position, refs = [], image = ""} = req.body;



    if (!username || !argument || position === undefined || position === null) {
      return res.status(400).json({ error: "Usuario y comentario son requeridos" });
    }

    const docRef = doc(debatesCollection, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Debate no encontrado" });
    }

    const debateData = docSnap.data();
    
    // Verificar posición del usuario
    let userPosition;
    if (debateData.peopleInFavor.includes(username)) userPosition = true;
    else if (debateData.peopleAgaist.includes(username)) userPosition = false;
    else {
      return res.status(400).json({ error: "Debe votar antes de comentar" });
    }

    // Moderar comentario con Gemini
    const moderationResult = await geminiService.moderateContent(argument);
    
    // Manejar decisiones de moderación
    if (moderationResult.decision === 'ELIMINADO') {
      return res.status(403).json({ 
        error: 'El comentario viola nuestras normas',
        reason: moderationResult.reason,
        categories: moderationResult.flaggedCategories
      });
    }

    // Crear comentario
    const newComment = {
      idComment: `auto_${Date.now()}`,
      paidComment: "",
      username,
      argument,
      likes: 0,
      dislikes: 0,
      position: userPosition,
      datareg: new Date().toISOString(),
      image,
      refs,
      moderationStatus: moderationResult.decision === 'CENSURADO' ? 'CENSORED' : 'APPROVED',
      moderationReason: moderationResult.decision === 'CENSURADO' ? moderationResult.reason : ''

    };

    // Registrar comentario censurado si aplica
    if (moderationResult.decision === 'CENSURADO') {
      await logCensoredContent({
        type: 'COMMENT',
        contentId: newComment.idComment,
        debateId: id,
        content: argument,
        username,
        reason: moderationResult.reason,
        categories: moderationResult.flaggedCategories
      });
    }

    await updateDoc(docRef, {
      comments: arrayUnion(newComment),
      popularity: increment(1),
    });
    const updatedSnap = await getDoc(docRef);
    const updatedDebate = Debate.fromFirestore(updatedSnap);
    const { username: owner, nameDebate, followers = [] } = updatedDebate;
    console.log("debate", updatedDebate);

    // Preparamos lista de destinatarios (dueño + cada follower)
    const recipients = Array.from(new Set([owner, ...followers]));
    const debateId = updatedDebate.idDebate;
    // Creamos notificación para cada uno
    await Promise.all(
      recipients.map(user => {
        const isOwner = user === owner;
        const texto = isOwner
          ? `${username} ha comentado en tu debate “${nameDebate}”`
          : `${username} ha comentado en el debate “${nameDebate}”`;
        return createNotification(user, texto, debateId);
      })
    );
 
    const created = updatedDebate.comments.find(c => c.idComment === newComment.idComment);

    // Registrar interacción de comentar en la actividad del usuario 
    try {
      // 1. Obtener el documento del usuario en Firestore
      const userQuery = query(usersCollection, where("username", "==", username));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
          console.warn(`Usuario ${username} no encontrado para actualizar actividad`);
      } else {
          // 2. Actualizar los campos de actividad
          const userDoc = userSnapshot.docs[0];
          await updateDoc(userDoc.ref, {
              "activity.interactions.comments": increment(1),
              "activity.score": increment(3), // 3 puntos por comentario según tu ponderación
              "updatedAt": new Date() // Actualizar marca de tiempo
          });
          await checkAndAwardBadges(username);
          // 3. Opcional: Actualizar tags/categoría si es relevante para el debate
          if (updatedDebate.category) {
              const categoryField = `activity.tags.${updatedDebate.category}`;
              await updateDoc(userDoc.ref, {
                  [categoryField]: increment(1)
              });
          }
      }
    } catch (userUpdateError) {
        console.error("Error al actualizar actividad del usuario:", userUpdateError);
    }
    
    return res.status(200).json(created || newComment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
},

  // Votar un debate
  position: async (req, res) => {
    try {
      const { id } = req.params;
      const { username, position } = req.body; // position: "InFavor", "Agaist" o null
      
      if (!username) {
        return res.status(400).json({ error: 'Usuario es requerido' });
      }
  
      const docRef = doc(debatesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Debate no encontrado' });
      }
  
      const debateData = docSnap.data();
      const updates = {};
  
      // Lógica para resetear voto
      if (position === null) {
        if (debateData.peopleInFavor.includes(username)) {
          updates.peopleInFavor = arrayRemove(username);
          updates.popularity = increment(-2);
        } else if (debateData.peopleAgaist.includes(username)) {
          updates.peopleAgaist = arrayRemove(username);
          updates.popularity = increment(-1);
        }
      } 
      // Lógica para votar
      else {
        // Remover de la posición contraria si existe
        const oppositePosition = position === "InFavor" ? "peopleAgaist" : "peopleInFavor";
        if (debateData[oppositePosition].includes(username)) {
          updates[oppositePosition] = arrayRemove(username);
          updates.popularity = position === "InFavor" ? increment(-1) : increment(-2);
        }
  
        // Añadir a la nueva posición si no existe
        const targetPosition = position === "InFavor" ? "peopleInFavor" : "peopleAgaist";
        if (!debateData[targetPosition].includes(username)) {
          updates[targetPosition] = arrayUnion(username);
          updates.popularity = position === "InFavor" ? increment(2) : increment(1);
        }
      }
  
      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, updates);
      }
  
      // Obtener datos actualizados
      const updatedSnap = await getDoc(docRef);
      const updatedDebate = Debate.fromFirestore(updatedSnap);
      await checkAndAwardBadges(username);
      res.status(200).json({
        message: position === null ? 'Voto reiniciado' : 'Voto registrado',
        peopleInFavor: updatedDebate.peopleInFavor,
        peopleAgaist: updatedDebate.peopleAgaist,
        popularity: updatedDebate.popularity
      });
   
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Buscar debates por categoría
getDebatesByCategory: async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { sort = 'active', search = '', censored = 'true' } = req.query;

      // Convertir showCensored a booleano
      let showCensoredContent;
      if (censored === 'true'){
        showCensoredContent = false;
      }else{
        showCensoredContent = true;
      }
  

    // 1. Validar que la categoría exista
    const categoryRef = doc(categoriesCollection, categoryId);
    const categorySnap = await getDoc(categoryRef);
    if (!categorySnap.exists()) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // 2. Obtener debates
    const q = query(debatesCollection, where('category', '==', categoryId));
    const querySnapshot = await getDocs(q);
    const debatesData = querySnapshot.docs.map(doc => Debate.fromFirestore(doc));

    let filteredDebates = debatesData;

    // 3. Filtrar censura
    if (!showCensoredContent) {
      filteredDebates = filteredDebates.filter(debate => debate.moderationStatus === 'APPROVED');
    }

    // 4. Búsqueda
    const searchTerm = search.toLowerCase();
    filteredDebates = filteredDebates.filter(debate => 
      debate.nameDebate.toLowerCase().includes(searchTerm) || 
      debate.argument.toLowerCase().includes(searchTerm)
    );

    // 5. Ordenamiento
    switch (sort) {
      case 'active':
        filteredDebates = filteredDebates.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
        break;
      case 'popular':
        filteredDebates = filteredDebates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'ancient':
        filteredDebates = filteredDebates.sort((a, b) => a.datareg - b.datareg);
        break;
      case 'recent':
      default:
        filteredDebates = filteredDebates.sort((a, b) => b.datareg - a.datareg);
        break;
    }

    // 6. Obtener datos del usuario para cada debate
    const enrichedDebates = await Promise.all(filteredDebates.map(async (debate) => {
      if (!debate.username) return { ...debate, user: null };

      try {
        const q = query(usersCollection, where('username', '==', debate.username));
        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          const { username, avatarId } = userData;
          return { ...debate, user: { username, avatarId } };
        }
      } catch (e) {
        console.error(`Error fetching user "${debate.username}":`, e);
      }

      return { ...debate, user: null }; // fallback si no se encuentra el usuario
    }));

    res.status(200).json(enrichedDebates);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
},


  // Obtener debates más populares
  getPopularDebates: async (req, res) => {
    try {
      const { censored = 'true' } = req.query;
      let showCensoredContent;
      if (censored === 'true'){
        showCensoredContent = false;
      }else{
        showCensoredContent = true;
      }

      // Construimos la consulta base
      let q;
      if (!showCensoredContent) {
        // Solo debates aprobados cuando censored=true
        q = query(
          debatesCollection,
          where('moderationStatus', '==', 'APPROVED'),
          orderBy('popularity', 'desc'),
          limit(5)
        );
      } else {
        // Todos los debates (sin filtro de aprobación) cuando censored=false
        q = query(
          debatesCollection,
          orderBy('popularity', 'desc'),
          limit(5)
        );
      }

    const querySnapshot = await getDocs(q);
    const debatesData = querySnapshot.docs.map(doc => Debate.fromFirestore(doc));

    // Ya no necesitamos filtrar después porque la consulta ya lo hizo
    const filteredDebates = debatesData;

      // Obtener IDs únicos de categorías
      const categoryIds = [...new Set(filteredDebates.map(debate => debate.category))];

      // Buscar todas las categorías en paralelo
      const categoryPromises = categoryIds.map(id => getDoc(doc(categoriesCollection, id)));
      const categorySnapshots = await Promise.all(categoryPromises);

      // Crear mapa de ID a nombre
      const categoryMap = {};
      categorySnapshots.forEach(snap => {
        if (snap.exists()) {
          const category = Category.fromFirestore(snap);
          categoryMap[snap.id] = category.name;
        }
      });

      // Reemplazar IDs con nombres
      const debates = debatesData.map(debate => {
        const json = debate.toJSON();
        json.category = categoryMap[debate.category] || null;
        return json;
      });

      res.status(200).json(debates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener debates más populares
getRecommendDebates: async (req, res) => {
  try {
    const { interests } = req.body;
    const { censored = 'true' } = req.query;

    let showCensoredContent = censored !== 'true';

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ error: "Se requiere un arreglo de intereses" });
    }

    let categoryDistribution = [];
    if (interests.length === 1) {
      categoryDistribution = [{ categoryId: interests[0], count: 3 }];
    } else if (interests.length === 2) {
      categoryDistribution = [
        { categoryId: interests[0], count: 2 },
        { categoryId: interests[1], count: 1 }
      ];
    } else {
      categoryDistribution = interests.slice(0, 3).map(categoryId => ({
        categoryId,
        count: 1
      }));
    }

    const debatePromises = categoryDistribution.map(({ categoryId, count }) => {
      const q = showCensoredContent
        ? query(
            debatesCollection,
            where('category', '==', categoryId),
            orderBy('popularity', 'desc'),
            limit(count)
          )
        : query(
            debatesCollection,
            where('moderationStatus', '==', 'APPROVED'),
            where('category', '==', categoryId),
            orderBy('popularity', 'desc'),
            limit(count)
          );
      return getDocs(q);
    });

    const querySnapshots = await Promise.all(debatePromises);
    let debatesData = [];
    querySnapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        debatesData.push(Debate.fromFirestore(doc));
      });
    });

    if (!showCensoredContent) {
      debatesData = debatesData.filter(debate => debate.moderationStatus === 'APPROVED');
    }

    debatesData = debatesData.sort(() => Math.random() - 0.5);

    // Obtener nombres de categorías
    const categoryIds = [...new Set(debatesData.map(debate => debate.category))];
    const categorySnapshots = await Promise.all(
      categoryIds.map(id => getDoc(doc(categoriesCollection, id)))
    );

    const categoryMap = {};
    categorySnapshots.forEach(snap => {
      if (snap.exists()) {
        const category = Category.fromFirestore(snap);
        categoryMap[snap.id] = category.name;
      }
    });

    // Obtener usuarios a partir de usernames
    const usernames = [...new Set(debatesData.map(debate => debate.username))];
    const userMap = {};

    for (const username of usernames) {
      const q = query(usersCollection, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const user = User.fromFirestore(userDoc);
        userMap[username] = {
          username: user.username,
          avatarId: user.avatarId || "1",
        };
      }
    }

    // Formatear respuesta final
    const debates = debatesData.map(debate => {
      const json = debate.toJSON();
      json.category = categoryMap[debate.category] || null;
      json.user = userMap[debate.username] || null;
      return json;
    });

    res.status(200).json(debates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},

  // debate.controller.js (agregar este nuevo método)
  addReplyComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { paidComment, username, argument, position, refs = [], image = "" } = req.body;
  
      if (!paidComment || !username || !argument || position === undefined) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
      }
  
      const debateRef = doc(debatesCollection, id);
      const debateSnap = await getDoc(debateRef);
      
      if (!debateSnap.exists()) {
        return res.status(404).json({ error: 'Debate no encontrado' });
      }
  
      const debateData = debateSnap.data();
      
      // Verificar comentario padre
      const parentComment = debateData.comments.find(c => c.idComment === paidComment);
      if (!parentComment) {
        return res.status(404).json({ error: 'Comentario padre no encontrado' });
      }
  
      // Verificar posición del usuario
      let userPosition;
      if (debateData.peopleInFavor.includes(username)) userPosition = true;
      else if (debateData.peopleAgaist.includes(username)) userPosition = false;
      else {
        return res.status(400).json({ error: 'Debe votar antes de comentar' });
      }
  
      // Moderar respuesta con Gemini
      const moderationResult = await geminiService.moderateContent(argument);
      
      if (moderationResult.decision === 'ELIMINADO') {
        return res.status(403).json({ 
          error: 'La respuesta viola nuestras normas',
          reason: moderationResult.reason,
          categories: moderationResult.flaggedCategories
        });
      }
  
      // Crear respuesta
      const newReply = {
        idComment: `auto_${Date.now()}`,
        paidComment,
        username,
        argument,
        likes: 0,
        dislikes: 0,
        position: userPosition,
        datareg: new Date().toISOString(),
        refs,
        moderationStatus: moderationResult.decision === 'CENSURADO' ? 'CENSORED' : 'APPROVED',
        moderationReason: moderationResult.decision === 'CENSURADO' ? moderationResult.reason : '',
        image
      };
  
      // Registrar respuesta censurada si aplica
      if (moderationResult.decision === 'CENSURADO') {
        await logCensoredContent({
          type: 'COMMENT',
          contentId: newReply.idComment,
          debateId: id,
          content: argument,
          username,
          reason: moderationResult.reason,
          categories: moderationResult.flaggedCategories
        });
      }
  
      await updateDoc(debateRef, {
        comments: arrayUnion(newReply),
        popularity: increment(1)
      });
  
      const updatedSnap = await getDoc(debateRef);
      const updatedDebate = Debate.fromFirestore(updatedSnap);
      const createdReply = updatedDebate.comments.find(c => c.idComment === newReply.idComment);
  
      // Registrar interacción de comentar en la actividad del usuario 
      try {
        // 1. Obtener el documento del usuario en Firestore
        const userQuery = query(usersCollection, where("username", "==", username));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
            console.warn(`Usuario ${username} no encontrado para actualizar actividad`);
        } else {
            // 2. Actualizar los campos de actividad
            const userDoc = userSnapshot.docs[0];
            await updateDoc(userDoc.ref, {
                "activity.interactions.comments": increment(1),
                "activity.interactions.replies": increment(1),
                "activity.score": increment(3), // 3 puntos por comentario según tu ponderación
                "updatedAt": new Date() // Actualizar marca de tiempo
            });
            await checkAndAwardBadges(username);
            // 3. Opcional: Actualizar tags/categoría si es relevante para el debate
            if (updatedDebate.category) {
                const categoryField = `activity.tags.${updatedDebate.category}`;
                await updateDoc(userDoc.ref, {
                    [categoryField]: increment(1)
                });
            }
        }
      } catch (userUpdateError) {
          console.error("Error al actualizar actividad del usuario:", userUpdateError);
      }

      res.status(201).json(createdReply || newReply);
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Buscar debates por término
  searchDebates: async (req, res) => {
    try {
      let { term, censored = 'true'} = req.query;
      
      if (!term) {
        return res.status(400).json({ error: 'Término de búsqueda es requerido' });
      }
      
      // Convertir showCensored a booleano
      let showCensoredContent;
      if (censored === 'true'){
        showCensoredContent = false;
      }else{
        showCensoredContent = true;
      }

      term = term.toLowerCase();
      
      const querySnapshot = await getDocs(debatesCollection);
      const debatesData = querySnapshot.docs.map(doc => Debate.fromFirestore(doc));
      
      let filteredDebates = debatesData;
      // 5. Filtrar debates según preferencia de censura
      if (!showCensoredContent) {
        // Filtrar los debates cuyo ID NO esté presente en el array de IDs censurados
        filteredDebates = debatesData.filter(debate => debate.moderationStatus == 'APPROVED')

      }

      // Filtrar debates por término de búsqueda
      
       filteredDebates = filteredDebates.filter(debate => 
        debate.nameDebate.toLowerCase().includes(term) || 
        debate.argument.toLowerCase().includes(term)
      );
      
      // Obtener IDs únicos de categorías de los debates filtrados
      const categoryIds = [...new Set(filteredDebates.map(debate => debate.category))];
      
      // Buscar todas las categorías en paralelo
      const categoryPromises = categoryIds.map(id => getDoc(doc(categoriesCollection, id)));
      const categorySnapshots = await Promise.all(categoryPromises);
      
      // Crear mapa de ID a nombre
      const categoryMap = {};
      categorySnapshots.forEach(snap => {
        if (snap.exists()) {
          const category = Category.fromFirestore(snap);
          categoryMap[snap.id] = category.name;
        }
      });
      
      // Reemplazar IDs con nombres y convertir a JSON
      const debates = filteredDebates.map(debate => {
        const json = debate.toJSON();
        json.category = categoryMap[debate.category] || null;
        return json;
      });
      
      res.status(200).json(debates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /debates/:id/follow
  followDebate: async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    const debateRef = doc(debatesCollection, id);
    await updateDoc(debateRef, {
      followers: arrayUnion(username)
    });
    res.status(200).json({ message: 'Seguido correctamente' });
  },

    // DELETE /debates/:id/follow
    unfollowDebate: async (req, res) => {
      const { id } = req.params;
      const { username } = req.body;
      const debateRef = doc(debatesCollection, id);
      await updateDoc(debateRef, {
        followers: arrayRemove(username)
      });
      res.status(200).json({ message: 'Dejado de seguir correctamente' });
    }
};

const getBestArgument = (comments) => {
  if (!comments || comments.length === 0) return null;
  
  const bestComment = comments.reduce((prev, current) => 
    (prev.likes > current.likes) ? prev : current
  );
  
  return {
    idComment: bestComment.idComment,
    argument: bestComment.argument,
    likes: bestComment.likes,
    position: bestComment.position,
    username: bestComment.username,
    datareg: bestComment.datareg,
    user: bestComment.user || null,
  };
};

module.exports = debateController;