const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Obtener todos los médicos
router.get('/', verificarToken, (req, res) => {
  db.all(
    `SELECT id, username, nombre_completo, consultorio, especialidad, activo 
     FROM usuarios 
     WHERE rol = 'medico'
     ORDER BY nombre_completo`,
    (err, medicos) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener médicos' });
      }
      res.json(medicos);
    }
  );
});

// Obtener un médico específico
router.get('/:id', verificarToken, verificarRol('sistema'), (req, res) => {
  const medicoId = req.params.id;
  
  db.get(
    `SELECT id, username, nombre_completo, consultorio, especialidad, activo 
     FROM usuarios 
     WHERE id = ? AND rol = 'medico'`,
    [medicoId],
    (err, medico) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener médico' });
      }
      
      if (!medico) {
        return res.status(404).json({ error: 'Médico no encontrado' });
      }
      
      res.json(medico);
    }
  );
});

// Crear nuevo médico
router.post('/', verificarToken, verificarRol('sistema'), async (req, res) => {
  const { username, password, nombre_completo, consultorio, especialidad } = req.body;
  
  if (!username || !password || !nombre_completo || !consultorio) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO usuarios (username, password, nombre_completo, rol, consultorio, especialidad)
       VALUES (?, ?, ?, 'medico', ?, ?)`,
      [username, hashedPassword, nombre_completo, consultorio, especialidad],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
          }
          return res.status(500).json({ error: 'Error al crear médico' });
        }
        
        res.json({ 
          id: this.lastID, 
          message: 'Médico creado exitosamente' 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error al encriptar contraseña' });
  }
});

// Actualizar médico
router.put('/:id', verificarToken, verificarRol('sistema'), async (req, res) => {
  const medicoId = req.params.id;
  const { username, password, nombre_completo, consultorio, especialidad, activo } = req.body;
  
  if (!username || !nombre_completo || !consultorio) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  
  try {
    let query = `UPDATE usuarios SET 
                   username = ?, 
                   nombre_completo = ?, 
                   consultorio = ?, 
                   especialidad = ?, 
                   activo = ?`;
    let params = [username, nombre_completo, consultorio, especialidad, activo !== undefined ? activo : 1];
    
    // Solo actualizar contraseña si se proporciona
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ? AND rol = ?';
    params.push(medicoId, 'medico');
    
    db.run(query, params, function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        return res.status(500).json({ error: 'Error al actualizar médico' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Médico no encontrado' });
      }
      
      res.json({ message: 'Médico actualizado exitosamente' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar médico' });
  }
});

// Eliminar médico
router.delete('/:id', verificarToken, verificarRol('sistema'), (req, res) => {
  const medicoId = req.params.id;
  
  // Verificar si el médico tiene turnos pendientes
  db.get(
    `SELECT COUNT(*) as count FROM turnos 
     WHERE medico_id = ? AND estado IN ('pendiente', 'llamado')`,
    [medicoId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar turnos' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar el médico porque tiene ${result.count} turno(s) pendiente(s)` 
        });
      }
      
      // Eliminar el médico
      db.run(
        'DELETE FROM usuarios WHERE id = ? AND rol = ?',
        [medicoId, 'medico'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error al eliminar médico' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Médico no encontrado' });
          }
          
          res.json({ message: 'Médico eliminado exitosamente' });
        }
      );
    }
  );
});

// Obtener estadísticas del médico (SIN autenticación para debugging)
router.get('/estadisticas', (req, res) => {
  // Por ahora, devolver estadísticas para Karina Stadler (ID 9) directamente
  const medicoId = 9;

  console.log('🔍 ===== ESTADÍSTICAS SOLICITADAS =====');
  console.log('🔍 Usuario ID:', medicoId, 'TODAS LAS FECHAS');
  console.log('🔍 ====================================');

  db.all(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
       SUM(CASE WHEN estado = 'llamado' THEN 1 ELSE 0 END) as llamados,
       SUM(CASE WHEN estado = 'atendido' THEN 1 ELSE 0 END) as atendidos,
       SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
     FROM turnos 
     WHERE medico_id = ?`,
    [medicoId],
    (err, result) => {
      if (err) {
        console.error('Error en estadísticas:', err);
        return res.status(500).json({ error: 'Error al obtener estadísticas' });
      }
      console.log('🔍 Estadísticas devueltas:', result[0]);
      res.json(result[0]);
    }
  );
});

// Ruta de prueba SIN autenticación
router.get('/test-estadisticas', (req, res) => {
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