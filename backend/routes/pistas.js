const express = require('express');
const router = express.Router();
const mongodb = require('../config/mongodb');

// GET /api/pistas - Obtener todas las pistas
router.get('/', async (req, res) => {
  try {
    const { activa = true, tipo, techado } = req.query;
    
    const collection = mongodb.collections.pistas();
    const filter = {};
    
    // Filtros opcionales
    if (activa !== undefined) filter.activa = activa === 'true';
    if (tipo) filter.tipo = tipo;
    if (techado !== undefined) filter.techado = techado === 'true';
    
    const pistas = await collection
      .find(filter)
      .sort({ precioHora: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: pistas
    });
  } catch (error) {
    console.error('Error obteniendo pistas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/pistas/:id - Obtener pista por ID
router.get('/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de pista inválido'
      });
    }
    
    const collection = mongodb.collections.pistas();
    const pista = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!pista) {
      return res.status(404).json({
        success: false,
        error: 'Pista no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: pista
    });
  } catch (error) {
    console.error('Error obteniendo pista:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/pistas/disponibilidad/:nombre - Verificar disponibilidad
router.get('/disponibilidad/:nombre', async (req, res) => {
  try {
    const { nombre } = req.params;
    const { fecha, duracion = 1 } = req.query;
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        error: 'Fecha es obligatoria'
      });
    }
    
    const fechaConsulta = new Date(fecha);
    const horaFin = new Date(fechaConsulta.getTime() + (duracion * 60 * 60 * 1000));
    
    const reservasCollection = mongodb.collections.reservas();
    
    // Buscar reservas conflictivas
    const conflictos = await reservasCollection.find({
      pista: decodeURIComponent(nombre),
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        { 
          fecha: {
            $gte: fechaConsulta,
            $lt: horaFin
          }
        },
        {
          $expr: {
            $and: [
              { $lte: ['$fecha', fechaConsulta] },
              { $gt: [{ $add: ['$fecha', { $multiply: ['$duracion', 3600000] }] }, fechaConsulta] }
            ]
          }
        }
      ]
    }).toArray();
    
    res.json({
      success: true,
      data: {
        pista: decodeURIComponent(nombre),
        fecha: fechaConsulta,
        duracion: parseFloat(duracion),
        disponible: conflictos.length === 0,
        conflictos: conflictos.length
      }
    });
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;