const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web_padel_db';

// Configuración de MongoDB con driver nativo
let client;
let db;

const connectMongoDB = async () => {
  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db();
    
    console.log('✅ MongoDB conectado correctamente');
    return { client, db };
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
};

// Configuración de Mongoose para esquemas
const connectMongoose = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Mongoose conectado correctamente');
  } catch (error) {
    console.error('❌ Error conectando Mongoose:', error.message);
    throw error;
  }
};

// Función ping para health check
const ping = async () => {
  try {
    if (!db) {
      await connectMongoDB();
    }
    await db.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB ping failed:', error.message);
    return false;
  }
};

// Inicializar conexiones al cargar el módulo
Promise.all([connectMongoDB(), connectMongoose()]).catch(console.error);

// Manejo de eventos de conexión de Mongoose
mongoose.connection.on('connected', () => {
  console.log('🍃 Mongoose conexión establecida');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 Mongoose error de conexión:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose desconectado');
});

// Cerrar conexiones al finalizar la aplicación
process.on('SIGINT', async () => {
  try {
    if (client) {
      await client.close();
    }
    await mongoose.connection.close();
    console.log('🛑 Conexiones MongoDB cerradas');
    process.exit(0);
  } catch (error) {
    console.error('Error cerrando conexiones MongoDB:', error);
    process.exit(1);
  }
});

module.exports = {
  client: () => client,
  db: () => db,
  mongoose,
  ping,
  // Funciones helper para usar las colecciones directamente
  collections: {
    usuarios: () => db?.collection('usuarios'),
    reservas: () => db?.collection('reservas'),
    torneos: () => db?.collection('torneos'),
    pistas: () => db?.collection('pistas'),
  }
};