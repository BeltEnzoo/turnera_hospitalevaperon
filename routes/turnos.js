const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { verificarToken, verificarRol } = require('../middleware/auth');

function obtenerMedicos() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, nombre_completo, username FROM usuarios WHERE rol = "medico"',
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows || []);
      }
    );
  });
}

function normalizarTexto(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}

function obtenerMedicoDesdeEspecialista(especialistaRaw, medicos = []) {
  if (!especialistaRaw) {
    return null;
  }

  const especialistaNorm = normalizarTexto(especialistaRaw);
  if (!especialistaNorm) {
    return null;
  }

  const tokensEspecialista = especialistaNorm.split(' ').filter(Boolean);
  const tokenPrincipal = tokensEspecialista[0] || '';

  const coincidenciaCompleta = medicos.find((medico) => {
    const nombreNorm = normalizarTexto(medico.nombre_completo || '');
    const tokensMedico = nombreNorm.split(' ').filter(Boolean);
    const coincidencias = tokensEspecialista.filter((token) =>
      tokensMedico.includes(token)
    );

    if (tokensEspecialista.length >= 2) {
      return coincidencias.length >= 2;
    }

    return coincidencias.length >= 1;
  });

  if (coincidenciaCompleta) {
    return coincidenciaCompleta;
  }

  if (tokenPrincipal) {
    const coincidenciaApellido = medicos.find((medico) => {
      const tokensMedico = normalizarTexto(medico.nombre_completo || '')
        .split(' ')
        .filter(Boolean);
      return tokensMedico.includes(tokenPrincipal);
    });

    if (coincidenciaApellido) {
      return coincidenciaApellido;
    }

    const coincidenciaUsuario = medicos.find((medico) =>
      normalizarTexto(medico.username || '').includes(tokenPrincipal)
    );

    if (coincidenciaUsuario) {
      return coincidenciaUsuario;
    }
  }

  return null;
}

// Configurar multer para subida de archivos
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Obtener todos los turnos (admin)
router.get('/', verificarToken, verificarRol('admin'), (req, res) => {
  const { fecha, estado } = req.query;
  
  let query = `
    SELECT t.*, u.nombre_completo as medico_nombre, u.especialidad
    FROM turnos t
    LEFT JOIN usuarios u ON t.medico_id = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (fecha) {
    query += ' AND t.fecha = ?';
    params.push(fecha);
  }
  
  if (estado) {
    query += ' AND t.estado = ?';
    params.push(estado);
  }
  
  query += ' ORDER BY t.fecha DESC, t.hora ASC';
  
  db.all(query, params, (err, turnos) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener turnos' });
    }
    res.json(turnos);
  });
});

// Obtener turnos del médico
router.get('/mis-turnos', verificarToken, verificarRol('medico'), (req, res) => {
  const medicoId = req.usuario.id;
  const { fecha } = req.query;
  const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];
  
  db.all(
    `SELECT * FROM turnos 
     WHERE medico_id = ? AND fecha = ? 
     ORDER BY hora ASC`,
    [medicoId, fechaBusqueda],
    (err, turnos) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener turnos' });
      }
      res.json(turnos);
    }
  );
});

// Crear turno manualmente
router.post('/', verificarToken, verificarRol('admin'), (req, res) => {
  const {
    numero_turno,
    paciente_nombre,
    paciente_documento,
    medico_id,
    consultorio,
    fecha,
    hora,
    observaciones
  } = req.body;

  if (!numero_turno || !paciente_nombre || !medico_id || !consultorio || !fecha || !hora) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  db.run(
    `INSERT INTO turnos (numero_turno, paciente_nombre, paciente_documento, medico_id, consultorio, fecha, hora, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [numero_turno, paciente_nombre, paciente_documento, medico_id, consultorio, fecha, hora, observaciones],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al crear turno' });
      }
      res.json({ id: this.lastID, message: 'Turno creado exitosamente' });
    }
  );
});

// Subir PDF y extraer turnos
router.post('/upload-pdf', verificarToken, verificarRol('admin'), upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo PDF' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const medicos = await obtenerMedicos();
    
    // Parsear el texto del PDF
    const turnos = parsearTurnosPDF(pdfData.text, medicos);
    
    if (turnos.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No se pudieron extraer turnos del PDF' });
    }

    // Insertar turnos en la base de datos
    let insertados = 0;
    let errores = 0;

    for (const turno of turnos) {
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO turnos (numero_turno, paciente_nombre, paciente_documento, medico_id, consultorio, fecha, hora)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [turno.numero_turno, turno.paciente_nombre, turno.paciente_documento, turno.medico_id, turno.consultorio, turno.fecha, turno.hora],
          function(err) {
            if (err) {
              errores++;
            } else {
              insertados++;
            }
            resolve();
          }
        );
      });
    }

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Procesado: ${insertados} turnos insertados, ${errores} errores`,
      turnos_procesados: turnos,
      insertados,
      errores
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error procesando PDF: ' + error.message });
  }
});

// Función para parsear turnos del PDF - Formato Hospital Dr. Alfredo Saintout
function parsearTurnosPDF(texto, medicos = []) {
  const turnos = [];
  
  // Debug: mostrar el texto extraído del PDF
  console.log('=== TEXTO EXTRAÍDO DEL PDF ===');
  console.log(texto.substring(0, 1000)); // Primeros 1000 caracteres
  console.log('=== FIN TEXTO ===');
  
  // Buscar información del documento
  const lineas = texto.split('\n');
  let fechaDocumento = null;
  let especialista = null;
  let consultorio = null;
  let numeroTurno = 1;
  
  // Extraer fecha del documento
  const fechaMatch = texto.match(/FECHA:\s*(\d{4}-\d{2}-\d{2})/);
  if (fechaMatch) {
    fechaDocumento = fechaMatch[1];
  }
  
  // Extraer especialista
  const especialistaMatch = texto.match(/Especialista:\s*([A-ZÁ-ÿ\s]+)/);
  if (especialistaMatch) {
    especialista = especialistaMatch[1].trim();
  }
  
  // Extraer consultorio
  const consultorioMatch = texto.match(/Servicio:\s*([A-ZÁ-ÿ\s]+)/);
  if (consultorioMatch) {
    consultorio = consultorioMatch[1].trim();
  }
  
  // Buscar filas de la tabla de pacientes
  // El texto viene sin espacios, así que usamos patrones de números para separar
  const patronFila = /^([A-ZÁ-ÿ][A-ZÁ-ÿ]+)\s*([A-ZÁ-ÿ]+)\s*(\d{7,8})(\d{1,2})([A-ZÁ-ÿ\s()]+)(\d+)(\d*)$/;
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    
    // Saltar líneas vacías y encabezados
    if (!linea || 
        linea.includes('Apellido y nombre') || 
        linea.includes('Nro. Doc.') ||
        linea.includes('ENTE DESCENTRALIZADO') ||
        linea.includes('Servicio:') ||
        linea.includes('Especialista:') ||
        linea.includes('FECHA:')) {
      continue;
    }
    
    // Debug: mostrar cada línea que procesamos
    console.log(`Procesando línea: "${linea}"`);
    
    // Intentar extraer datos usando diferentes patrones
    let apellidoNombre = '';
    let dni = '';
    let edad = '';
    let obraSocial = '';
    let hce = '';
    let hcAnt = '';
    
    // Patrón 1: NOMBRE APELLIDO + números
    const patron1 = /^([A-ZÁ-ÿ][A-ZÁ-ÿ]+)\s*([A-ZÁ-ÿ]+)(\d{7,8})(\d{1,2})([A-ZÁ-ÿ\s()]+)(\d+)(\d*)$/;
    const match1 = linea.match(patron1);
    
    if (match1) {
      apellidoNombre = `${match1[1]} ${match1[2]}`;
      dni = match1[3];
      edad = match1[4];
      obraSocial = match1[5].trim();
      hce = match1[6];
      hcAnt = match1[7];
    } else {
      // Patrón 2: Buscar DNI (8 dígitos seguidos)
      const dniMatch = linea.match(/(\d{8})/);
      if (dniMatch) {
        const dniIndex = linea.indexOf(dniMatch[1]);
        const antesDNI = linea.substring(0, dniIndex);
        const despuesDNI = linea.substring(dniIndex + 8);
        
        // Extraer nombre (todo lo que está antes del DNI)
        const nombreMatch = antesDNI.match(/([A-ZÁ-ÿ][A-ZÁ-ÿ]+)\s*([A-ZÁ-ÿ]+)/);
        if (nombreMatch) {
          apellidoNombre = `${nombreMatch[1]} ${nombreMatch[2]}`;
        }
        
        dni = dniMatch[1];
        
        // Extraer edad (2 dígitos después del DNI)
        const edadMatch = despuesDNI.match(/^(\d{1,2})/);
        if (edadMatch) {
          edad = edadMatch[1];
        }
        
        // Extraer obra social (texto después de la edad)
        const obraSocialMatch = despuesDNI.match(/^\d{1,2}([A-ZÁ-ÿ\s()]+)/);
        if (obraSocialMatch) {
          obraSocial = obraSocialMatch[1].trim();
        }
        
        // Extraer HCE (número largo al final)
        const hceMatch = linea.match(/(\d{8})$/);
        if (hceMatch) {
          hce = hceMatch[1];
        }
      }
    }
    
    // Si encontramos al menos nombre y DNI, crear el turno
    if (apellidoNombre && dni) {
      // Generar hora automáticamente (empezando desde las 08:00, cada 30 minutos)
      const horaInicio = 8; // 08:00
      const minutosPorTurno = 30;
      const hora = Math.floor((numeroTurno - 1) * minutosPorTurno / 60) + horaInicio;
      const minutos = ((numeroTurno - 1) * minutosPorTurno) % 60;
      const horaFormateada = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      
      // Mapear especialista a médico_id
      let medicoId = null;
      const medicoDetectado = obtenerMedicoDesdeEspecialista(especialista, medicos);

      if (medicoDetectado) {
        medicoId = medicoDetectado.id;
      } else {
        console.warn(`No se encontró médico para el especialista "${especialista}". Turno pendiente de asignación manual.`);
        continue;
      }
      
      // Debug: mostrar el mapeo
      console.log(`Especialista detectado: "${especialista}", Asignado a médico_id: ${medicoId}`);
      
      console.log(`Turno creado: ${apellidoNombre}, DNI: ${dni}, Edad: ${edad}`);
      
      turnos.push({
        numero_turno: `T${numeroTurno.toString().padStart(3, '0')}`,
        paciente_nombre: apellidoNombre,
        paciente_documento: dni,
        medico_id: medicoId,
        consultorio: consultorio || 'Consultorio Externo',
        fecha: fechaDocumento || new Date().toISOString().split('T')[0],
        hora: horaFormateada,
        observaciones: `Edad: ${edad}, Obra Social: ${obraSocial}, HCE: ${hce}`
      });
      
      numeroTurno++;
    }
  }
  
  return turnos;
}

// Llamar a un paciente
router.post('/:id/llamar', verificarToken, verificarRol('medico'), (req, res) => {
  const turnoId = req.params.id;
  const medicoId = req.usuario.id;
  const io = req.app.get('io');

  // Verificar que el turno pertenece al médico y obtener el consultorio del médico
  db.get(
    `SELECT t.*, u.consultorio as medico_consultorio 
     FROM turnos t 
     LEFT JOIN usuarios u ON t.medico_id = u.id 
     WHERE t.id = ? AND t.medico_id = ?`,
    [turnoId, medicoId],
    (err, turno) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener turno' });
      }

      if (!turno) {
        return res.status(404).json({ error: 'Turno no encontrado o no autorizado' });
      }

      // Usar el consultorio del médico, no del turno
      const consultorioMostrar = turno.medico_consultorio || turno.consultorio || 'Consultorio';

      // Actualizar estado del turno
      db.run(
        'UPDATE turnos SET estado = ?, llamado_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['llamado', turnoId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error al actualizar turno' });
          }

          // Registrar en historial
          db.run(
            'INSERT INTO historial_llamados (turno_id, medico_id, paciente_nombre, consultorio) VALUES (?, ?, ?, ?)',
            [turnoId, medicoId, turno.paciente_nombre, consultorioMostrar]
          );

          // Emitir evento por Socket.IO al display público
          const llamado = {
            paciente_nombre: turno.paciente_nombre,
            consultorio: consultorioMostrar,
            numero_turno: turno.numero_turno,
            timestamp: new Date().toISOString()
          };

          io.to('display-room').emit('nuevo-llamado', llamado);

          res.json({ message: 'Paciente llamado exitosamente', llamado });
        }
      );
    }
  );
});

// Actualizar estado de turno
router.patch('/:id/estado', verificarToken, verificarRol('medico'), (req, res) => {
  const turnoId = req.params.id;
  const { estado } = req.body;
  const medicoId = req.usuario.id;

  const estadosPermitidos = ['pendiente', 'llamado', 'atendido', 'ausente'];
  
  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  let updateQuery = 'UPDATE turnos SET estado = ?';
  const params = [estado];

  if (estado === 'atendido') {
    updateQuery += ', atendido_at = CURRENT_TIMESTAMP';
  }

  updateQuery += ' WHERE id = ? AND medico_id = ?';
  params.push(turnoId, medicoId);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar estado' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Estado actualizado exitosamente' });
  });
});

// Eliminar turno (Panel de Sistemas)
router.delete('/:id', verificarToken, verificarRol('sistema'), (req, res) => {
  const turnoId = req.params.id;
  
  db.run(
    'DELETE FROM turnos WHERE id = ?',
    [turnoId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al eliminar turno' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      
      res.json({ message: 'Turno eliminado exitosamente' });
    }
  );
});

// Limpiar turnos por fecha (Panel de Sistemas)
router.post('/limpiar', verificarToken, verificarRol('sistema'), (req, res) => {
  const { fecha } = req.body;
  
  if (!fecha) {
    return res.status(400).json({ error: 'Fecha requerida' });
  }
  
  db.run(
    'DELETE FROM turnos WHERE fecha = ?',
    [fecha],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al limpiar turnos' });
      }
      
      res.json({ 
        message: `${this.changes} turnos eliminados exitosamente`,
        eliminados: this.changes
      });
    }
  );
});

module.exports = router;

