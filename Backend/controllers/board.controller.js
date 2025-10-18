import { executeQuery } from '../config/conexion.js';

// ATENCIÓN: Se eliminó SIMULATED_USER_ID. 
// Todas las funciones ahora asumen que el middleware 'protect' se ejecutó 
// y el ID del usuario está disponible en req.user.id.

// --- 1. Crear Tablero (POST /api/boards) ---
// Requiere: Token JWT.
const createBoard = async (req, res) => {
    const { title, description, is_public } = req.body;
    // El owner_id se obtiene del usuario autenticado
    const owner_id = String(req.user.id); // Aseguramos que es String para la DB

    if (!title) {
        return res.status(400).json({ message: 'El título del tablero es obligatorio.' });
    }

    try {
        const insertQuery = `
            INSERT INTO boards (title, description, is_public, owner_id)
            VALUES (?, ?, ?, ?)
        `;
        const result = await executeQuery(insertQuery, [title, description || null, is_public === true, owner_id]);
        
        const newBoardIdString = String(result.insertId);

        if (newBoardIdString) {
            return res.status(201).json({
                id: newBoardIdString,
                title,
                description: description || null,
                is_public: is_public === true,
                owner_id: owner_id,
                message: "Tablero creado exitosamente."
            });
        }

    } catch (error) {
        console.error('Error al crear el tablero:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el tablero.', error: error.message });
    }
};

// --- 2. Obtener Todos los Tableros del Usuario (GET /api/boards) ---
// Requiere: Token JWT.
const getBoards = async (req, res) => {
    // El owner_id se obtiene del usuario autenticado
    const owner_id = String(req.user.id); // Aseguramos que es String

    try {
        const query = `
            SELECT id, title, description, is_public, owner_id, createdAt 
            FROM boards 
            WHERE owner_id = ? 
            ORDER BY createdAt DESC
        `;
        const boards = await executeQuery(query, [owner_id]);

        const formattedBoards = boards.map(board => ({
            ...board,
            id: String(board.id),
            owner_id: String(board.owner_id),
        }));

        res.status(200).json(formattedBoards);

    } catch (error) {
        console.error('Error al obtener tableros:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener los tableros.', error: error.message });
    }
};

// --- 3. Obtener Tablero por ID (GET /api/boards/:id) ---
// Requiere: Token JWT.
const getBoardById = async (req, res) => {
    const { id } = req.params;
    const owner_id = req.user.id; 

    // [MODIFICACIÓN] Coerción explícita a String para ambos parámetros de la consulta
    const safeId = String(id);
    const safeOwnerId = String(owner_id);

    try {
        // Se añade la verificación de owner_id a la consulta por seguridad
        const query = `
            SELECT id, title, description, is_public, owner_id, createdAt 
            FROM boards 
            WHERE id = ? AND owner_id = ?
        `;
        const boardResult = await executeQuery(query, [safeId, safeOwnerId]);
        const board = boardResult[0];

        if (!board) {
            return res.status(404).json({ message: 'Tablero no encontrado o no autorizado.' });
        }
        
        res.status(200).json({
            ...board,
            id: String(board.id),
            owner_id: String(board.owner_id)
        });

    } catch (error) {
        console.error('Error al obtener tablero por ID:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener el tablero.', error: error.message });
    }
};

// --- 4. Actualizar Tablero (PUT /api/boards/:id) ---
// Requiere: Token JWT.
const updateBoard = async (req, res) => {
    const { id } = req.params;
    const { title, description, is_public } = req.body;
    // El owner_id se obtiene del usuario autenticado
    const owner_id = req.user.id; 

    // [MODIFICACIÓN] Coerción explícita a String para ambos parámetros de la consulta
    const safeId = String(id);
    const safeOwnerId = String(owner_id);


    if (!title && description === undefined && is_public === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar al menos un campo para actualizar.' });
    }

    try {
        // Verificar que el tablero exista y pertenezca al usuario (filtrando por ambos IDs)
        const checkQuery = 'SELECT owner_id FROM boards WHERE id = ? AND owner_id = ?';
        const boardCheck = await executeQuery(checkQuery, [safeId, safeOwnerId]);

        if (boardCheck.length === 0) {
            return res.status(404).json({ message: 'Tablero no encontrado o no autorizado para actualizar.' });
        }

        let updateParts = [];
        let params = [];

        if (title !== undefined) { updateParts.push('title = ?'); params.push(title); }
        // description puede ser explícitamente null
        if (description !== undefined) { updateParts.push('description = ?'); params.push(description); } 
        if (is_public !== undefined) { updateParts.push('is_public = ?'); params.push(is_public === true); }

        if (updateParts.length === 0) {
            // Este caso ya debería ser capturado por el chequeo inicial, pero es un buen fallback.
            return res.status(400).json({ message: 'Datos de actualización incompletos.' });
        }

        const updateQuery = `
            UPDATE boards 
            SET ${updateParts.join(', ')} 
            WHERE id = ? AND owner_id = ?
        `;
        params.push(safeId, safeOwnerId); // Usamos las versiones con coerción

        const result = await executeQuery(updateQuery, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tablero no encontrado o no se realizaron cambios.' });
        }

        res.status(200).json({ id, message: 'Tablero actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar tablero:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el tablero.', error: error.message });
    }
};

// --- 5. Eliminar Tablero (DELETE /api/boards/:id) ---
// Requiere: Token JWT.
const deleteBoard = async (req, res) => {
    const { id } = req.params;
    // El owner_id se obtiene del usuario autenticado
    const owner_id = req.user.id; 

    // [MODIFICACIÓN] Coerción explícita a String para ambos parámetros de la consulta
    const safeId = String(id);
    const safeOwnerId = String(owner_id);

    try {
        const deleteQuery = `
            DELETE FROM boards 
            WHERE id = ? AND owner_id = ?
        `;
        const result = await executeQuery(deleteQuery, [safeId, safeOwnerId]); // Usamos las versiones con coerción

        if (result.affectedRows === 0) {
            // Si affectedRows es 0, el tablero no existe o no pertenece al usuario.
            return res.status(404).json({ message: 'Tablero no encontrado o no tiene permiso para eliminarlo.' });
        }

        res.status(200).json({ message: 'Tablero eliminado exitosamente.' });

    } catch (error) {
        console.error('Error al eliminar tablero:', error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el tablero.', error: error.message });
    }
};

export {
    createBoard,
    getBoards,
    getBoardById,
    updateBoard,
    deleteBoard,
};
