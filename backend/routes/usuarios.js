const express = require('express');
const router = express.Router();
const mongodb = require('../config/mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'padel-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
};

// POST /api/usuarios/register - Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, telefono, nivel = 'principiante' } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y contraseña son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const collection = mongodb.collections.usuarios();

    // Verificar si el email ya existe
    const existingUser = await collection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Hashear contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear nuevo usuario
    const newUser = {
      nombre,
      email: email.toLowerCase(),
      password: hashedPassword,
      telefono: telefono || '',
      nivel,
      activo: true,
      fechaRegistro: new Date(),
      ultimoAcceso: new Date()
    };

    const result = await collection.insertOne(newUser);
    
    // Generar JWT token
    const token = jwt.sign(
      { 
        id: result.insertedId,
        email: newUser.email,
        nombre: newUser.nombre 
      },
      process.env.JWT_SECRET || 'padel-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: result.insertedId,
          nombre,
          email: newUser.email,
          telefono,
          nivel,
          fechaRegistro: newUser.fechaRegistro
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/usuarios/login - Login de usuario
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    const collection = mongodb.collections.usuarios();

    // Buscar usuario por email
    const user = await collection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Actualizar último acceso
    await collection.updateOne(
      { _id: user._id },
      { $set: { ultimoAcceso: new Date() } }
    );

    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        nombre: user.nombre 
      },
      process.env.JWT_SECRET || 'padel-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          nivel: user.nivel,
          fechaRegistro: user.fechaRegistro
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/usuarios/profile - Obtener perfil del usuario autenticado
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const collection = mongodb.collections.usuarios();
    
    const user = await collection.findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/usuarios/logout - Logout (informativo, el token se maneja en frontend)
router.post('/logout', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const { nivel, activo = true, limit = 20, offset = 0 } = req.query;
    
    const collection = mongodb.collections.usuarios();
    const filter = {};
    
    // Filtros opcionales
    if (nivel) filter.nivel = nivel;
    if (activo !== undefined) filter.activo = activo === 'true';
    
    const usuarios = await collection
      .find(filter, { projection: { password: 0 } }) // Excluir password
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ fechaRegistro: -1 })
      .toArray();
    
    const total = await collection.countDocuments(filter);
    
    res.json({
      success: true,
      data: usuarios,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }
    
    const collection = mongodb.collections.usuarios();
    const usuario = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/usuarios - Crear nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email, telefono, nivel = 'principiante', preferencias = {} } = req.body;
    
    // Validaciones básicas
    if (!nombre || !email || !telefono) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y teléfono son obligatorios'
      });
    }
    
    const collection = mongodb.collections.usuarios();
    
    // Verificar si el email ya existe
    const usuarioExistente = await collection.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un usuario con ese email'
      });
    }
    
    // Crear nuevo usuario
    const nuevoUsuario = {
      nombre,
      email,
      telefono,
      nivel,
      fechaRegistro: new Date(),
      activo: true,
      preferencias: {
        posicion: preferencias.posicion || 'derecha',
        horarioPreferido: preferencias.horarioPreferido || 'tarde'
      }
    };
    
    const result = await collection.insertOne(nuevoUsuario);
    
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...nuevoUsuario
      },
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/usuarios/stats/niveles - Estadísticas por nivel
router.get('/stats/niveles', async (req, res) => {
  try {
    const collection = mongodb.collections.usuarios();
    
    const estadisticas = await collection.aggregate([
      {
        $group: {
          _id: '$nivel',
          cantidad: { $sum: 1 },
          usuarios: { 
            $push: {
              nombre: '$nombre',
              email: '$email',
              fechaRegistro: '$fechaRegistro'
            }
          }
        }
      },
      {
        $sort: { cantidad: -1 }
      }
    ]).toArray();
    
    const total = await collection.countDocuments({ activo: true });
    
    res.json({
      success: true,
      data: {
        total_usuarios_activos: total,
        por_nivel: estadisticas
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;