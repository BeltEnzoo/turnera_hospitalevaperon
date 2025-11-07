const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Obtener todos los usuarios (solo sistema)
router.get('/usuarios', verificarToken, verificarRol('sistema'), (req, res) => {
  db.all(`
    SELECT id, username, nombre_completo, rol, consultorio, especialidad, 
           CASE WHEN id IS NOT NULL THEN 1 ELSE 0 END as activo,
           datetime('now') as created_at
    FROM usuarios 
    ORDER BY id
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtener estadísticas de la base de datos (solo sistema)
router.get('/estadisticas', verificarToken, verificarRol('sistema'), (req, res) => {
  const estadisticas = {};
  
  // Contar usuarios por rol
  db.get('SELECT COUNT(*) as total FROM usuarios', (err, usuariosResult) => {
    if (err) return res.status(500).json({ error: err.message });
    estadisticas.total_usuarios = usuariosResult.total;
    
    db.get('SELECT COUNT(*) as total FROM usuarios WHERE rol = "medico"', (err, medicosResult) => {
      if (err) return res.status(500).json({ error: err.message });
      estadisticas.total_medicos = medicosResult.total;
      
      db.get('SELECT COUNT(*) as total FROM turnos', (err, turnosResult) => {
        if (err) return res.status(500).json({ error: err.message });
        estadisticas.total_turnos = turnosResult.total;
        
        db.get('SELECT COUNT(*) as total FROM historial_llamados', (err, historialResult) => {
          if (err) return res.status(500).json({ error: err.message });
          estadisticas.total_historial = historialResult.total;
          
          res.json(estadisticas);
        });
      });
    });
  });
});

// Limpiar base de datos (solo sistema)
router.post('/limpiar', verificarToken, verificarRol('sistema'), (req, res) => {
  const { confirmar } = req.body;
  
  if (!confirmar) {
    return res.status(400).json({ error: 'Confirmación requerida' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Eliminar en orden para respetar foreign keys
    db.run('DELETE FROM historial_llamados', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error limpiando historial: ' + err.message });
      }
      
      db.run('DELETE FROM turnos', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error limpiando turnos: ' + err.message });
        }
        
        db.run('DELETE FROM usuarios WHERE rol != "admin" AND rol != "sistema"', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error limpiando usuarios: ' + err.message });
          }
          
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error en commit: ' + err.message });
            }
            
            res.json({ 
              message: 'Base de datos limpiada exitosamente',
              eliminado: 'turnos, historial y médicos (mantiene admin y sistema)'
            });
          });
        });
      });
    });
  });
});

// Exportar base de datos (solo sistema)
router.get('/exportar', verificarToken, verificarRol('sistema'), (req, res) => {
  const exportData = {};
  
  // Exportar usuarios
  db.all('SELECT * FROM usuarios', (err, usuarios) => {
    if (err) return res.status(500).json({ error: err.message });
    exportData.usuarios = usuarios;
    
    // Exportar turnos
    db.all('SELECT * FROM turnos', (err, turnos) => {
      if (err) return res.status(500).json({ error: err.message });
      exportData.turnos = turnos;
      
      // Exportar historial
      db.all('SELECT * FROM historial_llamados', (err, historial) => {
        if (err) return res.status(500).json({ error: err.message });
        exportData.historial_llamados = historial;
        
        // Agregar metadatos
        exportData.exportado_en = new Date().toISOString();
        exportData.version = '1.0';
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="turnera_backup_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      });
    });
  });
});

// Optimizar base de datos (solo sistema)
router.post('/optimizar', verificarToken, verificarRol('sistema'), (req, res) => {
  db.serialize(() => {
    db.run('VACUUM', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error optimizando: ' + err.message });
      }
      
      db.run('ANALYZE', (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error analizando: ' + err.message });
        }
        
        res.json({ message: 'Base de datos optimizada exitosamente' });
      });
    });
  });
});

// Obtener estadísticas generales del sistema
router.get('/estadisticas', verificarToken, verificarRol('sistema'), (req, res) => {
  const { mes, especialidad, medico } = req.query;
  
  console.log('🔍 Estadísticas solicitadas:', { mes, especialidad, medico });
  
  // Construir condiciones WHERE
  let whereConditions = [];
  let params = [];
  
  if (mes) {
    whereConditions.push("strftime('%m', t.fecha) = ?");
    params.push(mes);
  }
  
  if (especialidad) {
    whereConditions.push("u.especialidad = ?");
    params.push(especialidad);
  }
  
  if (medico) {
    whereConditions.push("t.medico_id = ?");
    params.push(medico);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  // Consulta principal de estadísticas
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'medico' AND activo = 1) as medicos_activos,
      COUNT(t.id) as total_turnos,
      SUM(CASE WHEN t.estado = 'pendiente' THEN 1 ELSE 0 END) as turnos_pendientes,
      SUM(CASE WHEN t.estado = 'atendido' THEN 1 ELSE 0 END) as turnos_atendidos,
      SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) as turnos_ausentes,
      (SELECT COUNT(*) FROM historial_llamados ${mes ? "WHERE strftime('%m', llamado_at) = ?" : ''}) as total_llamados
    FROM turnos t
    LEFT JOIN usuarios u ON t.medico_id = u.id
    ${whereClause}
  `;
  
  // Agregar parámetro del mes para historial_llamados si es necesario
  if (mes) {
    params.push(mes);
  }
  
  db.get(query, params, (err, stats) => {
    if (err) {
      console.error('Error en estadísticas:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
    
    // Consulta de estadísticas por especialidad
    const especialidadQuery = `
      SELECT 
        u.especialidad as nombre,
        COUNT(t.id) as turnos,
        SUM(CASE WHEN t.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN t.estado = 'atendido' THEN 1 ELSE 0 END) as atendidos,
        SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
      FROM turnos t
      LEFT JOIN usuarios u ON t.medico_id = u.id
      ${whereClause}
      GROUP BY u.especialidad
      HAVING u.especialidad IS NOT NULL
      ORDER BY turnos DESC
    `;
    
    db.all(especialidadQuery, params, (err, especialidades) => {
      if (err) {
        console.error('Error en especialidades:', err);
        return res.status(500).json({ error: 'Error al obtener especialidades' });
      }
      
      res.json({
        ...stats,
        especialidades: especialidades
      });
    });
  });
});

module.exports = router;

