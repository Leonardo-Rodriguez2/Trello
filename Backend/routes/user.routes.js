import express from 'express';
import { 
    registerUser, 
    loginUser, 
    getMe
} from '../controllers/user.controller.js';

// 👈 AQUÍ LO ESTÁS LLAMANDO
import { protect } from '../middleware/auth.middleware.js'; 

const router = express.Router();

// Rutas Públicas (Registro e Inicio de Sesión)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Ruta Protegida: Lo USAS pasando 'protect' como argumento ANTES del controlador final
router.get('/me', protect, getMe);

export default router;
