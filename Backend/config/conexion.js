import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_trello',
  connectionLimit: 5,
});

export async function executeQuery(query, params = []) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(query, params);
  } finally {
    if (conn) await conn.release();
  }
}

export default pool;