const express = require('express');
const router = express.Router();
const mysql = require('../config/mysql');

// GET /api/articulos - Obtener todos los artículos
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, search } = req.query;
    
    let query = 'SELECT * FROM articulos WHERE 1=1';
    const params = [];
    
    // Filtro de búsqueda
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const articulos = await mysql.execute(query, params);
    
    // Contar total para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM articulos WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ' AND (title LIKE ? OR content LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [{ total }] = await mysql.execute(countQuery, countParams);
    
    res.json({
      success: true,
      data: articulos,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo artículos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/articulos/:id - Obtener artículo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const articulos = await mysql.execute('SELECT * FROM articulos WHERE id = ?', [id]);
    
    if (articulos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artículo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: articulos[0]
    });
  } catch (error) {
    console.error('Error obteniendo artículo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/articulos/stats/resumen - Estadísticas de artículos
router.get('/stats/resumen', async (req, res) => {
  try {
    const stats = await mysql.execute(`
      SELECT 
        COUNT(*) as total_articulos,
        COUNT(DISTINCT user_id) as total_autores,
        DATE(MIN(created_at)) as primer_articulo,
        DATE(MAX(created_at)) as ultimo_articulo
      FROM articulos
    `);
    
    const articulos_recientes = await mysql.execute(`
      SELECT id, title, created_at, image
      FROM articulos 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      success: true,
      data: {
        estadisticas: stats[0],
        articulos_recientes: articulos_recientes
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de artículos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;