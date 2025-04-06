const { Debate, debatesCollection } = require('../models/debate.model');
const { Category, categoriesCollection } = require('../models/category.model');
const {
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

const debateController = {
  // Crear debate
  createDebate: async (req, res) => {
    try {
      const { nameDebate, argument, category, username, refs = [], image = '' } = req.body;
     
      // Validaciones
      if (!nameDebate || !argument || !category || !username) {
        return res.status(400).json({ error: 'Nombre, argumento, categoría y usuario son requeridos' });
      }

      // Verificar que la categoría exista
      const categoryRef = doc(categoriesCollection, category);
      const categorySnap = await getDoc(categoryRef);
     
      if (!categorySnap.exists()) {
        return res.status(400).json({ error: 'La categoría no existe' });
      }

      // Crear nuevo debate
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

      await setDoc(newDebateRef, newDebate.toFirestore());

      // Obtener el debate recién creado para incluir el timestamp resuelto
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

    res.status(200).json(debate.toJSON());
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

 // Añadir comentario a un debate 
  addComment: async (req, res) => { 
    try { 
      const { id } = req.params; 
      const { username, comment } = req.body; 

      if (!username || !comment) { 
        return res.status(400).json({ error: 'Usuario y comentario son requeridos' }); 
      } 

      const docRef = doc(debatesCollection, id); 
      const docSnap = await getDoc(docRef); 

      if (!docSnap.exists()) { 
        return res.status(404).json({ error: 'Debate no encontrado' }); 
      } 

      const debateData = docSnap.data();
      let userPosition = null;
      if (debateData.peopleInFavor.includes(username)) {
        userPosition = "InFavor";
      } else if (debateData.peopleAgaist.includes(username)) {
        userPosition = "Agaist";
      } else {
        // El usuario no ha votado, por lo tanto no se permite comentar
        return res.status(400).json({ error: 'Debe votar antes de comentar' });
      }

      const newComment = { 
        username, 
        comment, 
        position: userPosition, 
        createdAt: serverTimestamp() 
      }; 

      await updateDoc(docRef, { 
        comments: arrayUnion(newComment), 
        popularity: increment(1) 
      }); 

      // Obtener el debate actualizado para devolver el comentario con timestamp 
      const updatedSnap = await getDoc(docRef); 
      const updatedDebate = Debate.fromFirestore(updatedSnap); 
      const createdComment = updatedDebate.comments.find(c =>  
        c.username === username && c.comment === comment 
      ); 

      res.status(200).json(createdComment || newComment); 
    } catch (error) { 
      res.status(500).json({ error: error.message }); 
    } 
  },


  // Votar un debate
  vote: async (req, res) => {
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

  // Buscar debates por categoría
  getDebatesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { sort = 'recent' } = req.query;
      // const sort = 'ancient'
      // Verificar que la categoría exista
      const categoryRef = doc(categoriesCollection, categoryId);
      const categorySnap = await getDoc(categoryRef);
     
      if (!categorySnap.exists()) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      const q = query(
        debatesCollection,
        where('category', '==', categoryId)
      );
     
      const querySnapshot = await getDocs(q);
      let debates = querySnapshot.docs.map(doc => {
        const debate = Debate.fromFirestore(doc);
        return debate
      });
      // Ordenamiento
      switch (sort) {
        case 'active':
          debates = debates.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
          break;
        case 'popular':
          debates = debates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          break;
        case 'ancient':
          debates = debates.sort((a, b) => a.datareg - b.datareg); // Resta directa de objetos Date
          break;
        case 'recent':
        default:
          debates = debates.sort((a, b) => b.datareg - a.datareg); // Resta directa de objetos Date
          break;
      }

      res.status(200).json(debates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener debates más populares
  getPopularDebates: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
     
      const q = query(
        debatesCollection,
        orderBy('popularity', 'desc'),
        limit(parseInt(limit))
      );
     
      const querySnapshot = await getDocs(q);
      const debates = querySnapshot.docs.map(doc => {
        const debate = Debate.fromFirestore(doc);
        return debate.toJSON();
      });
     
      res.status(200).json(debates);
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
     
      const q = query(debatesCollection);
      const querySnapshot = await getDocs(q);
     
      const debates = querySnapshot.docs
        .map(doc => Debate.fromFirestore(doc))
        .filter(debate => 
          debate.nameDebate.toLowerCase().includes(term) || 
          debate.argument.toLowerCase().includes(term)
        )
        .map(debate => debate.toJSON());
     
      res.status(200).json(debates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = debateController;