const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'turnera.db');

// Asegurar que el directorio existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios (médicos y administradores)
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre_completo TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('admin', 'medico')),
      consultorio TEXT,
      especialidad TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de turnos
  db.run(`
    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_turno TEXT NOT NULL,
      paciente_nombre TEXT NOT NULL,
      paciente_documento TEXT,
      medico_id INTEGER NOT NULL,
      consultorio TEXT NOT NULL,
      fecha DATE NOT NULL,
      hora TIME NOT NULL,
      estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'llamado', 'atendido', 'ausente', 'cancelado')),
      llamado_at DATETIME,
      atendido_at DATETIME,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medico_id) REFERENCES usuarios(id)
    )
  `);

  // Tabla de historial de llamados
  db.run(`
    CREATE TABLE IF NOT EXISTS historial_llamados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turno_id INTEGER NOT NULL,
      medico_id INTEGER NOT NULL,
      paciente_nombre TEXT NOT NULL,
      consultorio TEXT NOT NULL,
      llamado_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turno_id) REFERENCES turnos(id),
      FOREIGN KEY (medico_id) REFERENCES usuarios(id)
    )
  `);

  console.log('Tablas verificadas/creadas correctamente');
});

module.exports = db;


