-- ----------------------------------------
-- 1. Tabla de Usuarios (USER)
-- Reemplaza el esquema de Mongoose.
-- ----------------------------------------
CREATE TABLE users (
    -- ID primario y autoincrementable
    id INT AUTO_INCREMENT PRIMARY KEY, 
    
    -- Campos de autenticación
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    -- Contraseña hasheada (VARCHAR(255) es estándar para bcrypt)
    password VARCHAR(255) NOT NULL, 
    
    -- Campo de información personal
    fullName VARCHAR(100),

    -- Timestamps
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------
-- 2. Tabla de Tableros (BOARD)
-- Un tablero es creado por un usuario (owner).
-- ----------------------------------------
CREATE TABLE boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Clave foránea al usuario que creó el tablero
    owner_id INT NOT NULL, 
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Definición de la relación
    FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE -- Si el usuario se elimina, se eliminan sus tableros
);


-- ----------------------------------------
-- 3. Tabla de Listas (LIST)
-- Una lista pertenece a un tablero.
-- ----------------------------------------
CREATE TABLE lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    -- El campo 'order_index' es crucial para mantener el orden de las listas en el tablero.
    order_index INT NOT NULL, 
    
    -- Clave foránea al tablero al que pertenece
    board_id INT NOT NULL,
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Definición de la relación
    FOREIGN KEY (board_id) REFERENCES boards(id)
        ON DELETE CASCADE -- Si el tablero se elimina, se eliminan todas sus listas
);


-- ----------------------------------------
-- 4. Tabla de Tarjetas (CARD)
-- Una tarjeta pertenece a una lista.
-- ----------------------------------------
CREATE TABLE cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- El campo 'order_index' es crucial para mantener el orden de las tarjetas dentro de la lista.
    order_index INT NOT NULL, 
    due_date DATE,
    
    -- Clave foránea a la lista a la que pertenece
    list_id INT NOT NULL, 
    
    -- Clave foránea opcional: quién la creó
    creator_id INT, 
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Definiciones de relaciones
    FOREIGN KEY (list_id) REFERENCES lists(id)
        ON DELETE CASCADE, -- Si la lista se elimina, se eliminan todas sus tarjetas
        
    FOREIGN KEY (creator_id) REFERENCES users(id)
        ON DELETE SET NULL -- Si el usuario se elimina, el campo se pone a NULL
);


-- ----------------------------------------
-- 5. Tabla de Asignaciones (ASIGNACIÓN N:M)
-- Relación de muchos a muchos: muchos usuarios pueden estar asignados a muchas tarjetas.
-- ----------------------------------------
CREATE TABLE card_assignments (
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Clave primaria compuesta
    PRIMARY KEY (card_id, user_id), 

    -- Definiciones de relaciones
    FOREIGN KEY (card_id) REFERENCES cards(id)
        ON DELETE CASCADE,
        
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);