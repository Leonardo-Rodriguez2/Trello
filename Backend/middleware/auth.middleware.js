import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/conexion.js';

// NOTA IMPORTANTE: El secreto debe ser una variable de entorno para seguridad.
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

// Middleware de protección: verifica el token en la cabecera
const protect = async (req, res, next) => {
    let token;

    // 1. Comprueba si el encabezado 'Authorization' existe y empieza con 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtiene el token quitando "Bearer "
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifica y decodifica el token usando el secreto
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id; // El ID del usuario está en el payload del token
            
            // 3. Busca el usuario en la base de datos (segunda capa de seguridad)
            const query = 'SELECT id, username, email FROM users WHERE id = ?';
            const users = await executeQuery(query, [userId]);
            
            if (users.length === 0) {
                // El token es válido, pero el usuario ya no existe
                return res.status(401).json({ message: 'Token inválido, usuario no encontrado.' });
            }

            // 4. Adjunta el objeto de usuario al request. 
            // Esto permite que el controlador (ej: createBoard) acceda al ID seguro via req.user.id
            req.user = users[0];

            next(); // Continúa al controlador de la ruta

        } catch (error) {
            // Error común si el token ha expirado o es incorrecto
            console.error('Error de verificación de token:', error);
            return res.status(401).json({ message: 'Token no autorizado o expirado.' });
        }
    }

    if (!token) {
        // Si no se proporcionó ningún token en la cabecera
        return res.status(401).json({ message: 'No hay token, autorización denegada.' });
    }
};

export { protect };
