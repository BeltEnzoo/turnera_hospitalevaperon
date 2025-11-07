const express = require('express');
const router = express.Router();

// Ruta de prueba SIN autenticación
router.get('/estadisticas', (req, res) => {
  console.log('🧪 RUTA DE PRUEBA - SIN AUTENTICACIÓN');
  console.log('🧪 Fecha recibida:', req.query.fecha);
  
  res.json({
    total: 11,
    pendientes: 11,
    atendidos: 0,
    ausentes: 0,
    mensaje: 'Esta es una ruta de prueba SIN autenticación'
  });
});

module.exports = router;

