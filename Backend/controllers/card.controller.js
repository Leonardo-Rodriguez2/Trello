import { executeQuery } from '../config/conexion.js';

// --- HELPERS (Funciones Auxiliares) ---

/**
 * Obtiene todas las tarjetas de una lista específica.
 * @param {string} listId ID de la lista (se convierte a number para la DB)
 * @returns {Array} Array de tarjetas
 */
const getCardsInList = async (listId) => {
    // Convertir el ID a Number para la consulta SQL
    const numericListId = Number(listId); 
    
    const query = `
        SELECT 
            id, title, description, order_index, due_date, list_id, creator_id, createdAt, updatedAt
        FROM cards
        WHERE list_id = ?
        ORDER BY order_index ASC
    `;
    const cards = await executeQuery(query, [numericListId]);
    // Convertir IDs a String para evitar problemas de BigInt en la respuesta JSON
    return cards.map(card => ({
        ...card,
        id: String(card.id),
        list_id: String(card.list_id),
        creator_id: String(card.creator_id),
    }));
};

/**
 * Verifica si el usuario autenticado es el dueño del tablero al que pertenece la lista/tarjeta.
 * @param {string} userId ID del usuario autenticado (string)
 * @param {string} listId ID de la lista (string)
 * @returns {string|null} El ID del dueño del tablero (o "-1" si no autorizado, null si no existe).
 */
const verifyBoardOwnershipByListId = async (userId, listId) => {
    // Convertir el ID a Number para la consulta SQL
    const numericListId = Number(listId);

    const query = `
        SELECT b.owner_id
        FROM lists l
        JOIN boards b ON l.board_id = b.id
        WHERE l.id = ?
    `;
    
    // LOG DE DEPURACIÓN CRÍTICO: Muestra qué ID se está buscando.
    console.log(`[DEBUG - verifyBoardOwnershipByListId] Buscando lista con ID Numérico: ${numericListId}.`);

    const result = await executeQuery(query, [numericListId]);

    // LOG DE DEPURACIÓN: Muestra el resultado de la consulta.
    console.log(`[DEBUG - verifyBoardOwnershipByListId] Resultado de la consulta: ${JSON.stringify(result)}`);

    if (result.length === 0) return null; // Lista no existe

    const boardOwnerId = String(result[0].owner_id);
    if (boardOwnerId !== String(userId)) return "-1"; // No autorizado, devolvemos -1 como string para consistencia

    return boardOwnerId;
};

/**
 * Verifica si el usuario autenticado es el dueño del tablero al que pertenece la tarjeta.
 * @param {string} userId ID del usuario autenticado (string)
 * @param {string} cardId ID de la tarjeta (string)
 * @returns {string|null} El ID del dueño del tablero (o "-1" si no autorizado, null si no existe).
 */
const verifyBoardOwnershipByCardId = async (userId, cardId) => {
    // Convertir el ID a Number para la consulta SQL
    const numericCardId = Number(cardId);

    const query = `
        SELECT b.owner_id
        FROM cards c
        JOIN lists l ON c.list_id = l.id
        JOIN boards b ON l.board_id = b.id
        WHERE c.id = ?
    `;
    const result = await executeQuery(query, [numericCardId]);

    if (result.length === 0) return null; // Tarjeta no existe

    const boardOwnerId = String(result[0].owner_id);
    if (boardOwnerId !== String(userId)) return "-1"; // No autorizado

    return boardOwnerId;
};

// --- 1. Obtener Tarjetas por Lista (GET /api/lists/:listId/cards) ---
const getCardsByListId = async (req, res) => {
    const { listId } = req.params;
    const userId = req.user.id; // ID del usuario autenticado

    try {
        // 1. Verificar propiedad del tablero
        const ownerId = await verifyBoardOwnershipByListId(userId, listId);
        if (ownerId === null) {
            return res.status(404).json({ message: 'Lista no encontrada.' });
        }
        if (ownerId === "-1") {
            return res.status(403).json({ message: 'No autorizado para ver las tarjetas de esta lista.' });
        }
        
        // 2. Obtener tarjetas
        const cards = await getCardsInList(listId);

        res.status(200).json(cards);
    } catch (error) {
        console.error('Error al obtener tarjetas por lista:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las tarjetas.', error: error.message });
    }
};

// --- 2. Crear Tarjeta (POST /api/cards) ---
const createCard = async (req, res) => {
    // NOTA IMPORTANTE: list_id viene del body como string
    const { list_id, title, description, due_date } = req.body;
    const creator_id = req.user.id; // ID del creador (string)

    if (!list_id || !title) {
        return res.status(400).json({ message: 'El ID de la lista y el título son obligatorios.' });
    }

    try {
        // 1. Verificar propiedad del tablero
        // Se pasa list_id como string. La función ahora lo convierte a number internamente.
        const ownerId = await verifyBoardOwnershipByListId(creator_id, list_id); 
        
        if (ownerId === null) {
            // Este es el error que estás viendo: la lista no existe en la DB.
            return res.status(404).json({ message: 'La lista de destino no existe.' });
        }
        if (ownerId === "-1") {
            return res.status(403).json({ message: 'No autorizado para crear tarjetas en esta lista.' });
        }

        // 2. Calcular el order_index (será el último elemento)
        const cards = await getCardsInList(list_id);
        const order_index = cards.length; 

        // 3. Insertar la nueva tarjeta
        const numericListId = Number(list_id); // Convertir para inserción
        const numericCreatorId = Number(creator_id); // Convertir para inserción
        
        const insertQuery = `
            INSERT INTO cards (list_id, title, description, due_date, order_index, creator_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await executeQuery(insertQuery, [
            numericListId, 
            title, 
            description || null, 
            due_date || null, 
            order_index, 
            numericCreatorId
        ]);
        
        const newCardId = String(result.insertId);

        if (newCardId) {
            return res.status(201).json({
                id: newCardId,
                list_id: String(list_id),
                title,
                description: description || null,
                due_date: due_date || null,
                order_index,
                creator_id: String(creator_id),
                message: "Tarjeta creada exitosamente."
            });
        }

    } catch (error) {
        console.error('Error al crear tarjeta:', error);
        res.status(500).json({ message: 'Error en el servidor al crear la tarjeta.', error: error.message });
    }
};

// --- 3. Obtener Tarjeta por ID (GET /api/cards/:id) ---
const getCardById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // 1. Verificar propiedad del tablero
        const ownerId = await verifyBoardOwnershipByCardId(userId, id);
        if (ownerId === null) {
            return res.status(404).json({ message: 'Tarjeta no encontrada.' });
        }
        if (ownerId === "-1") {
            return res.status(403).json({ message: 'No autorizado para ver esta tarjeta.' });
        }

        // 2. Obtener tarjeta
        const numericId = Number(id); // Convertir ID a Number
        const query = `
            SELECT id, title, description, order_index, due_date, list_id, creator_id, createdAt, updatedAt
            FROM cards
            WHERE id = ?
        `;
        const cardResult = await executeQuery(query, [numericId]);
        const card = cardResult[0];

        res.status(200).json({
            ...card,
            id: String(card.id),
            list_id: String(card.list_id),
            creator_id: String(card.creator_id),
        });

    } catch (error) {
        console.error('Error al obtener tarjeta por ID:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener la tarjeta.', error: error.message });
    }
};

// --- 4. Actualizar Tarjeta (PUT /api/cards/:id) ---
// Permite actualizar campos y mover la tarjeta (cambiando list_id y/o order_index).
const updateCard = async (req, res) => {
    const { id } = req.params;
    const { title, description, due_date, list_id, order_index } = req.body;
    const userId = req.user.id;

    if (!title && !description && !due_date && !list_id && order_index === undefined) {
        return res.status(400).json({ message: 'Se debe proporcionar al menos un campo para actualizar.' });
    }

    try {
        // 1. Verificar propiedad del tablero
        const ownerId = await verifyBoardOwnershipByCardId(userId, id);
        if (ownerId === null) {
            return res.status(404).json({ message: 'Tarjeta no encontrada.' });
        }
        if (ownerId === "-1") {
            return res.status(403).json({ message: 'No autorizado para actualizar esta tarjeta.' });
        }
        
        let updateParts = [];
        let params = [];
        let cardMoved = false;
        const numericId = Number(id); // Convertir ID de la tarjeta a Number

        if (title !== undefined) { updateParts.push('title = ?'); params.push(title); }
        if (description !== undefined) { updateParts.push('description = ?'); params.push(description); }
        if (due_date !== undefined) { updateParts.push('due_date = ?'); params.push(due_date); }
        
        // Lógica de Movimiento
        if (list_id !== undefined || order_index !== undefined) {
             // Si cambia de lista, se necesita recalcular el índice automáticamente si no se proporciona
            if (list_id !== undefined) {
                 // Verificar si el nuevo list_id existe y pertenece al usuario
                const newListOwnerId = await verifyBoardOwnershipByListId(userId, list_id);
                if (newListOwnerId === null) {
                    return res.status(400).json({ message: 'La nueva lista de destino no existe.' });
                }
                if (newListOwnerId === "-1") {
                    return res.status(403).json({ message: 'No autorizado para mover la tarjeta a esa lista.' });
                }
                
                const numericListId = Number(list_id); // Convertir
                updateParts.push('list_id = ?'); 
                params.push(numericListId);
                cardMoved = true;
                
                // Si el índice no se proporciona al mover la lista, se coloca al final
                if (order_index === undefined) {
                    const newCards = await getCardsInList(list_id);
                    const newOrderIndex = newCards.length;
                    updateParts.push('order_index = ?'); 
                    params.push(newOrderIndex);
                }
            }
            
            // Si solo se actualiza el orden dentro de la misma lista
            if (order_index !== undefined) { 
                updateParts.push('order_index = ?'); 
                params.push(order_index);
                cardMoved = true;
            }
        }

        // Si no hay nada que actualizar, es un error 400
        if (updateParts.length === 0) {
            return res.status(400).json({ message: 'Datos de actualización incompletos.' });
        }

        const updateQuery = `
            UPDATE cards 
            SET ${updateParts.join(', ')} 
            WHERE id = ?
        `;
        params.push(numericId); // Usar el ID numérico

        const result = await executeQuery(updateQuery, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarjeta no encontrada o no se realizaron cambios.' });
        }
        
        // Nota: En un sistema de producción, se necesitaría lógica de reordenamiento 
        // para ajustar los order_index de las tarjetas vecinas después de un movimiento. 
        // Lo omitimos por simplicidad.

        res.status(200).json({ id, message: 'Tarjeta actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar tarjeta:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar la tarjeta.', error: error.message });
    }
};


// --- 5. Eliminar Tarjeta (DELETE /api/cards/:id) ---
const deleteCard = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // 1. Verificar propiedad del tablero
        const ownerId = await verifyBoardOwnershipByCardId(userId, id);
        if (ownerId === null) {
            return res.status(404).json({ message: 'Tarjeta no encontrada.' });
        }
        if (ownerId === "-1") {
            return res.status(403).json({ message: 'No autorizado para eliminar esta tarjeta.' });
        }
        
        // 2. Eliminar tarjeta
        const numericId = Number(id); // Convertir ID a Number
        const deleteQuery = 'DELETE FROM cards WHERE id = ?';
        const result = await executeQuery(deleteQuery, [numericId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarjeta no encontrada.' });
        }

        res.status(200).json({ message: 'Tarjeta eliminada exitosamente.' });

    } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        res.status(500).json({ message: 'Error en el servidor al eliminar la tarjeta.', error: error.message });
    }
};

export {
    getCardsByListId,
    createCard,
    getCardById,
    updateCard,
    deleteCard
};
