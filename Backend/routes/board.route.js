import express from 'express';
import { 
    createBoard,
    getBoards,
    updateBoard,
    deleteBoard,
    getBoardById
} from '../controllers/board.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas las rutas de tableros ahora están protegidas y requieren un Token JWT válido.
// El middleware 'protect' se encarga de verificar el token y adjuntar req.user.id.

// Crear un nuevo tablero (POST /api/boards)
router.post('/', protect, createBoard);

// Obtener todos los tableros del usuario autenticado (GET /api/boards)
router.get('/', protect, getBoards);

// Obtener un tablero por ID (GET /api/boards/:id)
router.get('/:id', protect, getBoardById);

// Actualizar un tablero por ID (PUT /api/boards/:id)
router.put('/:id', protect, updateBoard);

// Eliminar un tablero por ID (DELETE /api/boards/:id)
router.delete('/:id', protect, deleteBoard);

// Obtener listas de un tablero por ID (GET /api/boards/:id/lists)

export default router;
