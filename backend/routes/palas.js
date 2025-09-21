const express = require('express');
const router = express.Router();
const mysql = require('../config/mysql');

// GET /api/palas - Obtener todas las palas
router.get('/', async (req, res) => {
  try {
    const { marca, precio_min, precio_max, peso_min, peso_max, balance, forma, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM palas WHERE 1=1';
    const params = [];
    
    // Filtros opcionales
    if (marca) {
      query += ' AND marca LIKE ?';
      params.push(`%${marca}%`);
    }
    
    if (precio_min) {
      query += ' AND precio >= ?';
      params.push(parseFloat(precio_min));
    }
    
    if (precio_max) {
      query += ' AND precio <= ?';
      params.push(parseFloat(precio_max));
    }
    
    if (peso_min) {
      query += ' AND peso >= ?';
      params.push(parseInt(peso_min));
    }
    
    if (peso_max) {
      query += ' AND peso <= ?';
      params.push(parseInt(peso_max));
    }
    
    if (balance) {
      query += ' AND balance = ?';
      params.push(balance);
    }
    
    if (forma) {
      query += ' AND forma = ?';
      params.push(forma);
    }
    
    query += ' ORDER BY marca, modelo LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const palas = await mysql.execute(query, params);
    
    // Contar total para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM palas WHERE 1=1';
    const countParams = params.slice(0, -2); // Remover limit y offset
    
    if (marca) countQuery += ' AND marca LIKE ?';
    if (precio_min) countQuery += ' AND precio >= ?';
    if (precio_max) countQuery += ' AND precio <= ?';
    if (peso_min) countQuery += ' AND peso >= ?';
    if (peso_max) countQuery += ' AND peso <= ?';
    if (balance) countQuery += ' AND balance = ?';
    if (forma) countQuery += ' AND forma = ?';
    
    const [{ total }] = await mysql.execute(countQuery, countParams);
    
    res.json({
      success: true,
      data: palas,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo palas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/palas/:id - Obtener pala por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const palas = await mysql.execute('SELECT * FROM palas WHERE id = ?', [id]);
    
    if (palas.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pala no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: palas[0]
    });
  } catch (error) {
    console.error('Error obteniendo pala:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/palas/marcas - Obtener todas las marcas
router.get('/stats/marcas', async (req, res) => {
  try {
    const marcas = await mysql.execute(`
      SELECT marca, COUNT(*) as cantidad, 
             AVG(precio) as precio_promedio,
             MIN(precio) as precio_min,
             MAX(precio) as precio_max
      FROM palas 
      GROUP BY marca 
      ORDER BY marca
    `);
    
    res.json({
      success: true,
      data: marcas
    });
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/palas/stats/precios - Estadísticas de precios
router.get('/stats/precios', async (req, res) => {
  try {
    const stats = await mysql.execute(`
      SELECT 
        COUNT(*) as total_palas,
        AVG(precio) as precio_promedio,
        MIN(precio) as precio_min,
        MAX(precio) as precio_max,
        AVG(peso) as peso_promedio,
        MIN(peso) as peso_min,
        MAX(peso) as peso_max
      FROM palas
    `);
    
    const rangos_precio = await mysql.execute(`
      SELECT 
        CASE 
          WHEN precio < 130 THEN 'Económicas (< 130€)'
          WHEN precio BETWEEN 130 AND 160 THEN 'Intermedias (130-160€)'
          WHEN precio BETWEEN 160 AND 190 THEN 'Premium (160-190€)'
          ELSE 'Profesionales (> 190€)'
        END as rango,
        COUNT(*) as cantidad
      FROM palas
      GROUP BY rango
      ORDER BY MIN(precio)
    `);
    
    res.json({
      success: true,
      data: {
        estadisticas_generales: stats[0],
        rangos_precio: rangos_precio
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;