const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: 'Demasiadas peticiones desde esta IP'
});
app.use('/api', limiter);

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Importar conexiones a bases de datos
const mysqlConnection = require('./config/mysql');
const mongoConnection = require('./config/mongodb');

// Importar rutas
const palasRoutes = require('./routes/palas');
const articulosRoutes = require('./routes/articulos');
const usuariosRoutes = require('./routes/usuarios');
const reservasRoutes = require('./routes/reservas');
const torneosRoutes = require('./routes/torneos');
const pistasRoutes = require('./routes/pistas');

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    message: '🎾 Web Padel API - Backend Híbrido',
    version: '1.0.0',
    databases: {
      mysql: 'Contenido estático (palas, artículos)',
      mongodb: 'Datos dinámicos (usuarios, reservas, torneos)'
    },
    endpoints: {
      static: ['/api/palas', '/api/articulos'],
      dynamic: ['/api/usuarios', '/api/reservas', '/api/torneos', '/api/pistas']
    }
  });
});

// Endpoint de salud
app.get('/health', async (req, res) => {
  try {
    // Verificar MySQL
    const mysqlHealth = await mysqlConnection.ping();
    
    // Verificar MongoDB
    const mongoHealth = await mongoConnection.db.admin().ping();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        mysql: mysqlHealth ? 'Connected' : 'Disconnected',
        mongodb: mongoHealth ? 'Connected' : 'Disconnected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Configurar rutas de la API
app.use('/api/palas', palasRoutes);        // MySQL - Catálogo
app.use('/api/articulos', articulosRoutes); // MySQL - Blog  
app.use('/api/usuarios', usuariosRoutes);   // MongoDB - Usuarios
app.use('/api/reservas', reservasRoutes);   // MongoDB - Reservas
app.use('/api/torneos', torneosRoutes);     // MongoDB - Torneos
app.use('/api/pistas', pistasRoutes);       // MongoDB - Pistas

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 MySQL: ${process.env.MYSQL_DATABASE}`);
  console.log(`🍃 MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;