import { auth } from '../../../config/firebase.config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

// Registrar un nuevo usuario
export const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    res.status(201).json({ message: 'Usuario registrado', uid: userCredential.user.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Iniciar sesión
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken(); // Obtener el token de Firebase
    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Recuperar contraseña
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    await sendPasswordResetEmail(auth, email);
    res.status(200).json({ message: 'Correo de recuperación enviado' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};