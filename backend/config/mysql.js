const mysql = require('mysql2/promise');

// Configuración de la conexión MySQL
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 60000
};

// Crear pool de conexiones
const pool = mysql.createPool(config);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL conectado correctamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

// Función ping para health check
const ping = async () => {
  try {
    await pool.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('MySQL ping failed:', error.message);
    return false;
  }
};

// Inicializar conexión al cargar el módulo
testConnection();

module.exports = {
  pool,
  testConnection,
  ping,
  // Función helper para ejecutar queries
  execute: async (sql, params = []) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Asegurar que estamos usando la base de datos correcta
      await connection.query(`USE ${process.env.MYSQL_DATABASE || 'backend_laravel'}`);
      
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      console.error('MySQL Query Error:', error.message);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
};