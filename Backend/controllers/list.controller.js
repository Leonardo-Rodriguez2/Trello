import { executeQuery } from '../config/conexion.js';

// --- 1. Crear Lista (POST /api/lists) ---
const createList = async (req, res) => {
    const { board_id, title } = req.body;
    const user_id = req.user.id; // ID del usuario autenticado

    if (!board_id || !title) {
        return res.status(400).json({ message: 'El board_id y el título son obligatorios.' });
    }

    try {
        // 1. Verificar si el tablero existe Y si el usuario es el propietario (Check combinado)
        const checkBoardQuery = 'SELECT owner_id FROM boards WHERE id = ? AND owner_id = ?';
        // Aseguramos que board_id se use como String
        const safeBoardId = String(board_id); 
        const boardResult = await executeQuery(checkBoardQuery, [safeBoardId, user_id]); // Añadimos user_id

        if (boardResult.length === 0) {
            // Si no se encuentra, es un 404 o 403 (Tablero no encontrado o no autorizado)
            return res.status(404).json({ message: 'Tablero no encontrado o no autorizado para añadir listas.' });
        }
        // Ya no necesitamos la segunda verificación de propiedad porque la consulta lo hizo.

        // 2. Obtener el índice de orden más alto para la nueva lista
        const maxOrderQuery = 'SELECT MAX(order_index) as max_order FROM lists WHERE board_id = ?';
        const maxOrderResult = await executeQuery(maxOrderQuery, [safeBoardId]);
        // Si no hay listas, max_order será 0. Si hay, se incrementa.
        const newOrderIndex = (maxOrderResult[0].max_order || 0) + 1;

        // 3. Insertar la nueva lista
        const insertQuery = `
            INSERT INTO lists (board_id, title, order_index)
            VALUES (?, ?, ?)
        `;
        const result = await executeQuery(insertQuery, [safeBoardId, title, newOrderIndex]);
        const newListId = String(result.insertId);

        return res.status(201).json({
            id: newListId,
            title,
            board_id: safeBoardId,
            order_index: newOrderIndex,
            message: "Lista creada exitosamente."
        });

    } catch (error) {
        console.error('Error al crear la lista:', error);
        res.status(500).json({ message: 'Error en el servidor al crear la lista.', error: error.message });
    }
};

// --- 2. Obtener Listas por ID de Tablero (Usada en board.routes.js) ---
const getListsByBoardId = async (req, res) => {
    // CORRECCIÓN: Usamos 'id' de req.params, que es el nombre probable en la ruta
    const { id } = req.params; 
    const user_id = req.user.id; // ID del usuario autenticado
    
    // Asignamos el ID extraído al nombre que el resto de la función espera
    const safeBoardId = String(id); 

    try {
        // [AÑADIDO PARA DEBUGGING] Mostrar los IDs usados para ayudar al usuario a diagnosticar Auth/Propiedad
        console.log(`[DEBUG LISTS] Intentando obtener listas para Board ID: ${safeBoardId} y User ID: ${user_id}`);

        // 1. Verificar si el tablero existe Y si el usuario es el propietario (Check combinado)
        const checkBoardQuery = 'SELECT owner_id FROM boards WHERE id = ? AND owner_id = ?';
        const boardResult = await executeQuery(checkBoardQuery, [safeBoardId, user_id]);
        
        if (boardResult.length === 0) {
            // Si safeBoardId es "undefined" (por error de ruta), devuelve el mensaje con "undefined"
            return res.status(404).json({ 
                message: `Tablero ID ${safeBoardId} no encontrado o no autorizado.` 
            });
        }
        // Si todo va bien, el tablero existe y es propiedad del usuario.

        // 2. Obtener todas las listas ordenadas
        const query = `
            SELECT id, title, order_index, board_id, createdAt 
            FROM lists 
            WHERE board_id = ?
            ORDER BY order_index ASC
        `;
        const lists = await executeQuery(query, [safeBoardId]); 

        const formattedLists = lists.map(list => ({
            ...list,
            id: String(list.id),
            board_id: String(list.board_id)
        }));

        res.status(200).json(formattedLists);

    } catch (error) {
        console.error('Error al obtener listas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las listas.', error: error.message });
    }
};

// --- 3. Actualizar Lista (PUT /api/lists/:id) ---
const updateList = async (req, res) => {
    const { id } = req.params; // Usamos 'id'
    const { title, order_index } = req.body;
    const user_id = req.user.id; 
    
    // Aseguramos que el ID de la lista sea un string limpio
    const safeListId = String(id); 

    if (!title && order_index === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar el título o el order_index para actualizar.' });
    }

    try {
        // 1. Verificar si la lista existe Y si pertenece a un tablero propiedad del usuario
        // Incluimos b.owner_id = ? en el WHERE para la verificación de propiedad en la misma consulta
        const listQuery = `
            SELECT l.board_id
            FROM lists l 
            JOIN boards b ON l.board_id = b.id 
            WHERE l.id = ? AND b.owner_id = ?
        `;
        const listResult = await executeQuery(listQuery, [safeListId, user_id]); // Añadimos user_id

        if (listResult.length === 0) {
            // El tablero no existe, la lista no existe, o no pertenece al usuario
            return res.status(404).json({ message: 'Lista no encontrada o no tiene permisos para modificarla.' });
        }

        const boardId = listResult[0].board_id;

        // 2. Construir la consulta de actualización
        let updateParts = [];
        let params = [];

        if (title !== undefined) { updateParts.push('title = ?'); params.push(title); }
        if (order_index !== undefined) { updateParts.push('order_index = ?'); params.push(order_index); }

        const updateQuery = `
            UPDATE lists 
            SET ${updateParts.join(', ')} 
            WHERE id = ? AND board_id = ?
        `;
        params.push(safeListId, boardId); 

        const result = await executeQuery(updateQuery, params);

        if (result.affectedRows === 0) {
            // Este caso solo debería ocurrir si no se realizaron cambios (los permisos ya se verificaron)
            return res.status(200).json({ id: safeListId, message: 'Lista actualizada exitosamente (pero sin cambios en los datos).' });
        }

        res.status(200).json({ id: safeListId, message: 'Lista actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar lista:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar la lista.', error: error.message });
    }
};

// --- 4. Eliminar Lista (DELETE /api/lists/:id) ---
const deleteList = async (req, res) => {
    const { id } = req.params; // Usamos 'id'
    const user_id = req.user.id;
    
    // Aseguramos que el ID de la lista sea un string limpio
    const safeListId = String(id); 

    try {
        // 1. Verificar si la lista existe y obtener el board_id para la verificación de propiedad
        // Incluimos b.owner_id = ? en el WHERE
        const listQuery = `
            SELECT l.board_id 
            FROM lists l 
            JOIN boards b ON l.board_id = b.id 
            WHERE l.id = ? AND b.owner_id = ?
        `;
        const listResult = await executeQuery(listQuery, [safeListId, user_id]); // Añadimos user_id

        if (listResult.length === 0) {
            // El tablero no existe, la lista no existe, o no pertenece al usuario
            return res.status(404).json({ message: 'Lista no encontrada o no tiene permisos para eliminarla.' });
        }
        
        const boardId = listResult[0].board_id;

        // 2. Eliminar la lista (y las tarjetas por CASCADE)
        // Agregamos board_id a la cláusula WHERE para asegurar atomicidad
        const deleteQuery = 'DELETE FROM lists WHERE id = ? AND board_id = ?';
        const result = await executeQuery(deleteQuery, [safeListId, boardId]); 

        if (result.affectedRows === 0) {
            // Esto solo ocurriría si la lista fue eliminada por otra acción justo antes
            return res.status(404).json({ message: 'Lista no encontrada.' });
        }

        res.status(200).json({ message: 'Lista eliminada exitosamente (y tarjetas asociadas por CASCADE).' });

    } catch (error) {
        console.error('Error al eliminar lista:', error);
        res.status(500).json({ message: 'Error en el servidor al eliminar la lista.', error: error.message });
    }
};


export {
    createList,
    getListsByBoardId,
    updateList,
    deleteList
};
