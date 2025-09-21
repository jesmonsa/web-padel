const express = require('express');
const router = express.Router();
const mongodb = require('../config/mongodb');
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

// GET /api/reservas - Obtener todas las reservas
router.get('/', async (req, res) => {
  try {
    const { estado, pista, usuario, fecha_desde, fecha_hasta, limit = 20, offset = 0 } = req.query;
    
    const collection = mongodb.collections.reservas();
    const filter = {};
    
    // Filtros opcionales
    if (estado) filter.estado = estado;
    if (pista) filter.pista = { $regex: pista, $options: 'i' };
    if (usuario) filter.usuario = { $regex: usuario, $options: 'i' };
    
    // Filtros de fecha
    if (fecha_desde || fecha_hasta) {
      filter.fecha = {};
      if (fecha_desde) filter.fecha.$gte = new Date(fecha_desde);
      if (fecha_hasta) filter.fecha.$lte = new Date(fecha_hasta);
    }
    
    const reservas = await collection
      .find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ fecha: -1 })
      .toArray();
    
    const total = await collection.countDocuments(filter);
    
    res.json({
      success: true,
      data: reservas,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/reservas/:id - Obtener reserva por ID
router.get('/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de reserva inválido'
      });
    }
    
    const collection = mongodb.collections.reservas();
    const reserva = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: reserva
    });
  } catch (error) {
    console.error('Error obteniendo reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/reservas - Crear nueva reserva
router.post('/', async (req, res) => {
  try {
    const { usuario, email, pista, fecha, duracion, precio } = req.body;
    
    // Validaciones básicas
    if (!usuario || !email || !pista || !fecha || !duracion) {
      return res.status(400).json({
        success: false,
        error: 'Usuario, email, pista, fecha y duración son obligatorios'
      });
    }
    
    const fechaReserva = new Date(fecha);
    if (fechaReserva < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'No se puede reservar en fechas pasadas'
      });
    }
    
    const collection = mongodb.collections.reservas();
    
    // Verificar disponibilidad (simplificado)
    const horaInicio = new Date(fechaReserva);
    const horaFin = new Date(fechaReserva.getTime() + (duracion * 60 * 60 * 1000));
    
    const conflicto = await collection.findOne({
      pista,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        { 
          fecha: {
            $gte: horaInicio,
            $lt: horaFin
          }
        },
        {
          $expr: {
            $and: [
              { $lte: ['$fecha', horaInicio] },
              { $gt: [{ $add: ['$fecha', { $multiply: ['$duracion', 3600000] }] }, horaInicio] }
            ]
          }
        }
      ]
    });
    
    if (conflicto) {
      return res.status(409).json({
        success: false,
        error: 'La pista no está disponible en ese horario'
      });
    }
    
    // Crear nueva reserva
    const nuevaReserva = {
      usuario,
      email,
      pista,
      fecha: fechaReserva,
      duracion: parseFloat(duracion),
      precio: precio || 25.0,
      estado: 'pendiente',
      fechaCreacion: new Date()
    };
    
    const result = await collection.insertOne(nuevaReserva);
    
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...nuevaReserva
      },
      message: 'Reserva creada exitosamente'
    });
  } catch (error) {
    console.error('Error creando reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/reservas/:id - Actualizar reserva (requiere autenticación)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    const { pista, fecha, hora, duracion, estado } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de reserva inválido'
      });
    }

    const collection = mongodb.collections.reservas();
    
    // Verificar que la reserva existe y pertenece al usuario
    const existingReserva = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!existingReserva) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    // Verificar ownership (el usuario solo puede editar sus propias reservas)
    if (existingReserva.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar esta reserva'
      });
    }

    // Preparar datos de actualización
    const updateData = {
      fechaActualizacion: new Date()
    };

    // Actualizar campos opcionales
    if (pista) updateData.pista = pista;
    if (fecha) updateData.fecha = new Date(fecha);
    if (hora) updateData.hora = hora;
    if (duracion) updateData.duracion = parseFloat(duracion);
    if (estado && ['pendiente', 'confirmada', 'cancelada'].includes(estado)) {
      updateData.estado = estado;
    }

    // Recalcular precio si cambió la duración
    if (duracion) {
      const precios = { 'Central': 25, 'Norte': 20, 'Sur': 15 };
      const pistaKey = pista || existingReserva.pista;
      updateData.precio = precios[pistaKey] * parseFloat(duracion);
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    // Obtener la reserva actualizada
    const updatedReserva = await collection.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      data: updatedReserva
    });
    
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/reservas/:id - Eliminar reserva (requiere autenticación)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de reserva inválido'
      });
    }

    const collection = mongodb.collections.reservas();
    
    // Verificar que la reserva existe y pertenece al usuario
    const existingReserva = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!existingReserva) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    // Verificar ownership (el usuario solo puede eliminar sus propias reservas)
    if (existingReserva.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar esta reserva'
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Reserva eliminada exitosamente',
      data: { id: id }
    });
    
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/reservas/stats/dashboard - Dashboard de reservas
router.get('/stats/dashboard', async (req, res) => {
  try {
    const collection = mongodb.collections.reservas();
    
    // Estadísticas generales
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          ingresos: { $sum: '$precio' }
        }
      }
    ]).toArray();
    
    // Reservas por pista
    const porPista = await collection.aggregate([
      {
        $group: {
          _id: '$pista',
          cantidad: { $sum: 1 },
          ingresos: { $sum: '$precio' }
        }
      },
      { $sort: { cantidad: -1 } }
    ]).toArray();
    
    // Reservas por día de la semana
    const porDia = await collection.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$fecha' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    const total = await collection.countDocuments();
    const ingresosTotales = await collection.aggregate([
      { $group: { _id: null, total: { $sum: '$precio' } } }
    ]).toArray();
    
    res.json({
      success: true,
      data: {
        resumen: {
          total_reservas: total,
          ingresos_totales: ingresosTotales[0]?.total || 0
        },
        por_estado: stats,
        por_pista: porPista,
        por_dia_semana: porDia.map(d => ({
          dia: ['', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d._id],
          cantidad: d.cantidad
        }))
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard de reservas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;