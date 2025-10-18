// server.js
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.routes.js';
import boardRoutes from './routes/board.route.js';
import cardRoutes from './routes/card.route.js';
import listRoutes from './routes/list.route.js';

// connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// Rutas de Usuario
app.use('/api/users', userRoutes);

app.use('/api/boards', boardRoutes); 

app.use('/api/lists', listRoutes);

app.use('/api/cards', cardRoutes);


// Manejo de errores (opcional, pero recomendado)
// ...

const PORT =  3000;

app.listen(PORT, () => console.log(`Servidor iniciado en el puerto http://localhost:${PORT}`));