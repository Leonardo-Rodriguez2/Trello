import { executeQuery } from '../config/conexion.js'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Secreto del JWT (debería ser una variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

// Función para generar el token
// Utilizamos String(id) para evitar problemas de serialización con BigInt del DB driver.
const generateToken = (id) => {
    return jwt.sign({ id: String(id) }, JWT_SECRET, {
        expiresIn: '30d', 
    });
};

const registerUser = async (req, res) => {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password || !fullName) {
        return res.statuts(400).json({ message: 'Todo los campos son obligatorios.'});
    }

    try {
        const checkQuery = 'SELECT id, username, email FROM users WHERE email = ? OR username = ?';
        const existingUsers = await executeQuery(checkQuery, [email, username]);
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'El usuario o email ya están registrados.' });
        }
        
        // Hashing de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const insertQuery = `
            INSERT INTO users (username, email, password, fullName)
            VALUES (?, ?, ?, ?)
        `;
        const result = await executeQuery(insertQuery, [username, email, hashedPassword, fullName]);
        
        // FIX: result.insertId es el BigInt que causa el error. Lo convertimos inmediatamente.
        const newUserIdString = String(result.insertId); 

        if (newUserIdString) {
            res.status(201).json({
                id: newUserIdString, 
                username: username,
                email: email,
                fullName: fullName,
                // Generar token con el ID convertido a string
                token: generateToken(newUserIdString) 
            });
        } else {
            res.status(400).json({ message: 'Error al crear el usuario en la base de datos.' });
        }

    } catch (error) {
        
        if (error.code === 'ER_DUP_ENTRY') { 
             return res.status(400).json({ 
                 message: 'El usuario o email ya están registrados.', 
                 detail: 'Ya existe un usuario con ese nombre de usuario o email.'
             });
        }
        
        res.status(500).json({ 
            message: 'Error en el servidor al registrar el usuario.', 
            error: error.message 
        });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'El email y la contraseña son requeridos.' });
    }

    try {
        const query = 'SELECT id, username, email, fullName, password FROM users WHERE email = ?';
        const users = await executeQuery(query, [email]);
        const user = users[0];

        if (user) {
            // Compara la contraseña en texto plano con el hash de la BD
            const isMatch = await bcrypt.compare(password, user.password); 

            if (isMatch) {
                // FIX: Aseguramos la conversión del ID a string, ya que puede ser BigInt.
                const userIdString = String(user.id);

                res.json({
                    id: userIdString,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    // Generar y retornar el token
                    token: generateToken(userIdString)
                });
            } else {
                res.status(401).json({ message: 'Credenciales inválidas (contraseña incorrecta).' });
            }
        } else {
            res.status(401).json({ message: 'Credenciales inválidas (usuario no encontrado).' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al intentar iniciar sesión.', error: error.message });
    }
};


const getMe = async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'No se pudo obtener la información del usuario autenticado.' });
    }
    
    res.status(200).json({
        id: String(req.user.id), 
        username: req.user.username,
        email: req.user.email,
    });
};


export {
    registerUser,
    loginUser,
    getMe,
};
