require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Hacer io accesible en las rutas
app.set('io', io);

// Rutas
const authRoutes = require('./routes/auth');
const turnoRoutes = require('./routes/turnos');
const medicoRoutes = require('./routes/medicos');
const displayRoutes = require('./routes/display');
const databaseRoutes = require('./routes/database');
const testRoutes = require('./routes/test');

app.use('/api/auth', authRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/display', displayRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/test', testRoutes);

// Ruta temporal para estadísticas de reportes SIN autenticación
app.get('/api/reportes-stats', (req, res) => {
  console.log('🔍 Estadísticas de reportes solicitadas');
  
  const db = require('./database/db');
  
  // Consulta de estadísticas generales
  db.all(`
    SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'medico' AND activo = 1) as medicos_activos,
      COUNT(t.id) as total_turnos,
      SUM(CASE WHEN t.estado = 'pendiente' THEN 1 ELSE 0 END) as turnos_pendientes,
      SUM(CASE WHEN t.estado = 'atendido' THEN 1 ELSE 0 END) as turnos_atendidos,
      SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) as turnos_ausentes,
      (SELECT COUNT(*) FROM turnos WHERE estado IN ('atendido', 'ausente')) as total_llamados
    FROM turnos t
  `, (err, stats) => {
    if (err) {
      console.error('Error en estadísticas:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
    
    // Consulta de especialidades
    db.all(`
      SELECT 
        u.especialidad as nombre,
        COUNT(t.id) as turnos,
        SUM(CASE WHEN t.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN t.estado = 'atendido' THEN 1 ELSE 0 END) as atendidos,
        SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) as ausentes
      FROM turnos t
      LEFT JOIN usuarios u ON t.medico_id = u.id
      GROUP BY u.especialidad
      HAVING u.especialidad IS NOT NULL
      ORDER BY turnos DESC
    `, (err, especialidades) => {
      if (err) {
        console.error('Error en especialidades:', err);
        return res.status(500).json({ error: 'Error al obtener especialidades' });
      }
      
      console.log('🔍 Estadísticas devueltas:', stats[0]);
      res.json({
        ...stats[0],
        especialidades: especialidades
      });
    });
  });
});

// Ruta directa para estadísticas SIN middleware
app.get('/api/stats', (req, res) => {
  console.log('🔍 ===== ESTADÍSTICAS DIRECTAS =====');
  console.log('🔍 Ruta directa SIN middleware');
  console.log('🔍 =================================');
  
  const db = require('./database/db');
  
  // Obtener el médico_id del query parameter
  const medicoId = req.query.medico_id || 9; // Default a Karina si no se especifica
  console.log('🔍 Médico ID solicitado:', medicoId);
  
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
        console.error('Error en estadísticas directas:', err);
        return res.status(500).json({ error: 'Error al obtener estadísticas' });
      }
      console.log('🔍 Estadísticas directas devueltas:', result[0]);
      res.json(result[0]);
    }
  );
});

// Socket.IO para notificaciones en tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join-display', () => {
    socket.join('display-room');
    console.log('Display público conectado');
  });

  socket.on('join-medico', (medicoId) => {
    socket.join(`medico-${medicoId}`);
    console.log(`Médico ${medicoId} conectado`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  console.log(`Panel administrativo: http://localhost:${PORT}/admin.html`);
  console.log(`Panel médico: http://localhost:${PORT}/medico.html`);
  console.log(`Panel de sistemas: http://localhost:${PORT}/sistema.html`);
  console.log(`Display público: http://localhost:${PORT}/display.html`);
});

