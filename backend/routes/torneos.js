const express = require('express');
const router = express.Router();
const mongodb = require('../config/mongodb');

// GET /api/torneos - Obtener todos los torneos
router.get('/', async (req, res) => {
  try {
    const { estado, categoria, limit = 10, offset = 0 } = req.query;
    
    const collection = mongodb.collections.torneos();
    const filter = {};
    
    // Filtros opcionales
    if (estado) filter.estado = estado;
    if (categoria) filter.categoria = categoria;
    
    const torneos = await collection
      .find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ fechaInicio: 1 })
      .toArray();
    
    const total = await collection.countDocuments(filter);
    
    res.json({
      success: true,
      data: torneos,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo torneos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/torneos/:id - Obtener torneo por ID
router.get('/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de torneo inválido'
      });
    }
    
    const collection = mongodb.collections.torneos();
    const torneo = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!torneo) {
      return res.status(404).json({
        success: false,
        error: 'Torneo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: torneo
    });
  } catch (error) {
    console.error('Error obteniendo torneo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/torneos/proximos - Obtener torneos próximos
router.get('/proximos/activos', async (req, res) => {
  try {
    const collection = mongodb.collections.torneos();
    
    const torneosProximos = await collection
      .find({
        fechaInicio: { $gte: new Date() },
        estado: { $in: ['abierto', 'programado'] }
      })
      .sort({ fechaInicio: 1 })
      .limit(5)
      .toArray();
    
    res.json({
      success: true,
      data: torneosProximos
    });
  } catch (error) {
    console.error('Error obteniendo torneos próximos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;