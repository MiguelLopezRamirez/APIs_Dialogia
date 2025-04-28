const { Debate, debatesCollection,censoredCollection } = require('../models/debate.model');
const geminiService = require('../services/gemini.service');
const { createNotification } = require('../services/notification.service');
const { Category, categoriesCollection } = require('../models/category.model');
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
  /*getAllDebates: async (req, res) => {
    try {
      const querySnapshot = await getDocs(debatesCollection);
      const debates = querySnapshot.docs.map(doc => {
        const debate = Debate.fromFirestore(doc);

        debate.category = "hola";

        return debate.toJSON();
      });
     
      res.status(200).json(debates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener debate por ID
  getDebateById: async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = doc(debatesCollection, id);
      const docSnap = await getDoc(docRef);
     
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Debate no encontrado' });
      }
     
      const debate = Debate.fromFirestore(docSnap);
      res.status(200).json(debate.toJSON());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },*/

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
  const { action, method } = req.body; // action: "like" o "dislike", method: "add" o "remove"

  if (!['like', 'dislike'].includes(action) || !['add', 'remove'].includes(method)) {
    return res.status(400).json({ error: 'Acción o método inválido' });
  }

  try {
    // Obtén la referencia y el snapshot del debate en Firestore
    const debateRef = doc(debatesCollection, id);
    const debateSnap = await getDoc(debateRef);
    
    if (!debateSnap.exists()) {
      return res.status(404).json({ error: 'Debate no encontrado' });
    }
    
    // Extrae los datos del debate
    const debateData = debateSnap.data();

    // Busca el índice del comentario
    const commentIndex = debateData.comments.findIndex(c => c.idComment === idComment);
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }
    
    // Inicializa contadores si no existen
    debateData.comments[commentIndex].likes = debateData.comments[commentIndex].likes || 0;
    debateData.comments[commentIndex].dislikes = debateData.comments[commentIndex].dislikes || 0;

    // Actualiza el contador según la acción y el método recibido
    if (action === 'like') {
      debateData.comments[commentIndex].likes = 
        method === 'add'
          ? debateData.comments[commentIndex].likes + 1
          : Math.max(debateData.comments[commentIndex].likes - 1, 0);
    } else if (action === 'dislike') {
      debateData.comments[commentIndex].dislikes = 
        method === 'add'
          ? debateData.comments[commentIndex].dislikes + 1
          : Math.max(debateData.comments[commentIndex].dislikes - 1, 0);
    }
    
    // Guarda los cambios en Firestore
    await updateDoc(debateRef, { comments: debateData.comments });
    res.json(debateData.comments[commentIndex]);
  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
},

// Obtener debate por ID
getDebateById: async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = doc(debatesCollection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Debate no encontrado' });
    }
    
    const debate = Debate.fromFirestore(docSnap);
    
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

    console.debug("DEBUG: addComment recibidos:", { id, username, argument, refs, image });


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

  // addComment: async (req, res) => {
  //   try {
  //     const { id } = req.params; // ID del debate
  //     const { username, text, refs, position } = req.body; // position: true para "A Favor", false para "En Contra"

  //     // Validar campos obligatorios
  //     if (!username || !text) {
  //       return res.status(400).json({ error: "El nombre de usuario y el comentario son requeridos" });
  //     }

  //     // Construir el objeto comentario
  //     const comment = {
  //       username,
  //       text,
  //       refs: refs || [], // refs es un arreglo de referencias (URLs)
  //       position, // valor booleano: true significa "A Favor", false "En Contra"
  //       createdAt: serverTimestamp()
  //     };

  //     // Suponiendo que cada debate tiene una subcolección 'comments'
  //     const commentsCollectionRef = collection(db, "debates", id, "comments");
  //     const docRef = await addDoc(commentsCollectionRef, comment);

  //     // Opcionalmente, puedes devolver el ID generado
  //     comment.id = docRef.id;

  //     res.status(201).json(comment);
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // },

  // Buscar debates por categoría
  getDebatesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { sort = 'active', search = '' } = req.query; // Añadir search
  
      // 1. Validar que la categoría exista
    const categoryRef = doc(categoriesCollection, categoryId);
    const categorySnap = await getDoc(categoryRef);
    if (!categorySnap.exists()) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // 2. Obtener y procesar debates
    const q = query(debatesCollection, where('category', '==', categoryId));
    const querySnapshot = await getDocs(q);
    const debatesData = querySnapshot.docs.map(doc => Debate.fromFirestore(doc));
    const searchTerm = search.toLowerCase();
    let filteredDebates = debatesData.filter(debate => 
      debate.nameDebate.toLowerCase().includes(searchTerm) || 
      debate.argument.toLowerCase().includes(searchTerm)
    );

  
      // Ordenamiento
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
  
      res.status(200).json(filteredDebates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener debates más populares
  getPopularDebates: async (req, res) => {
    try {     
      const q = query(
        debatesCollection,
        orderBy('popularity', 'desc'),
        limit(5)
      );
     
      const querySnapshot = await getDocs(q);
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

  // Obtener debates más populares
  getRecommendDebates: async (req, res) => {
    try {
      const { interests } = req.body; // Array de IDs de categorías de interés
      
      if (!interests || !Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ error: "Se requiere un arreglo de intereses" });
      }
  
      // Determinar distribución de debates por categoría
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
  
      // Obtener debates para cada categoría según la distribución
      const debatePromises = categoryDistribution.map(({ categoryId, count }) => {
        const q = query(
          debatesCollection,
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
  
      // Mezclar los debates para no agruparlos por categoría
      debatesData = debatesData.sort(() => Math.random() - 0.5);
  
      // Obtener nombres de categorías (igual que antes)
      const categoryIds = [...new Set(debatesData.map(debate => debate.category))];
      const categoryPromises = categoryIds.map(id => getDoc(doc(categoriesCollection, id)));
      const categorySnapshots = await Promise.all(categoryPromises);
  
      const categoryMap = {};
      categorySnapshots.forEach(snap => {
        if (snap.exists()) {
          const category = Category.fromFirestore(snap);
          categoryMap[snap.id] = category.name;
        }
      });
  
      // Formatear respuesta
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

  // debate.controller.js (agregar este nuevo método)
  addReplyComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { paidComment, username, argument, position, refs = [] } = req.body;
  
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
        moderationReason: moderationResult.decision === 'CENSURADO' ? moderationResult.reason : ''
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
  
      res.status(201).json(createdReply || newReply);
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Buscar debates por término
  searchDebates: async (req, res) => {
    try {
      let { term } = req.query;
      
      if (!term) {
        return res.status(400).json({ error: 'Término de búsqueda es requerido' });
      }
      
      term = term.toLowerCase();
      
      const querySnapshot = await getDocs(debatesCollection);
      const debatesData = querySnapshot.docs.map(doc => Debate.fromFirestore(doc));
      
      // Filtrar debates por término de búsqueda
      const filteredDebates = debatesData.filter(debate => 
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
    datareg: bestComment.datareg
  };
};

module.exports = debateController;