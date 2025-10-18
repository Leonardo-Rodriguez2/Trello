import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { 
    createList,
    updateList,
    deleteList,
    getListsByBoardId
    // La función getListsByBoardId se exporta desde board.routes.js
} from '../controllers/list.controller.js';

const router = express.Router();

// --- Rutas Protegidas de Listas (/api/lists) ---

// 1. Crear una nueva lista. Requiere { board_id, title } en el body.
router.post('/', protect, createList);

// 2. Actualizar una lista por ID (cambia título o order_index)
router.put('/:id', protect, updateList);

// 3. Eliminar una lista por ID
router.delete('/:id', protect, deleteList);

router.get('/:id/lists', protect, getListsByBoardId);


export default router;
