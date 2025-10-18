import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { 
    createCard,
    getCardById,
    updateCard,
    deleteCard,
    getCardsByListId
} from '../controllers/card.controller.js';

const router = express.Router();

// --- Rutas Protegidas de Tarjetas (/api/cards) ---

// 1. Crear una nueva tarjeta. Requiere { list_id, title } en el body.
router.post('/', protect, createCard);

// 2. Obtener todas las tarjetas de una LISTA específica.
// Acceso: GET /api/cards/list/:listId
router.get('/list/:listId', protect, getCardsByListId);

// 3. Obtener una tarjeta por ID
router.get('/:id', protect, getCardById);

// 4. Actualizar una tarjeta por ID (incluye lógica para moverla de lista)
router.put('/:id', protect, updateCard);

// 5. Eliminar una tarjeta por ID
router.delete('/:id', protect, deleteCard);

export default router;
