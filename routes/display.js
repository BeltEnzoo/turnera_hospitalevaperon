const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Obtener últimos llamados
router.get('/ultimos-llamados', (req, res) => {
  const limite = req.query.limite || 5;
  
  db.all(
    `SELECT * FROM historial_llamados 
     ORDER BY llamado_at DESC 
     LIMIT ?`,
    [limite],
    (err, llamados) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener historial' });
      }
      res.json(llamados);
    }
  );
});

// Obtener información del día
router.get('/info-dia', (req, res) => {
  const hoy = new Date().toISOString().split('T')[0];
  
  db.all(
    `SELECT 
       COUNT(*) as total_turnos,
       SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
       SUM(CASE WHEN estado = 'atendido' THEN 1 ELSE 0 END) as atendidos
     FROM turnos 
     WHERE fecha = ?`,
    [hoy],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener información' });
      }
      res.json(result[0]);
    }
  );
});

module.exports = router;



