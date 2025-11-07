require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function initDatabase() {
  console.log('Inicializando base de datos...');

  // Crear usuario administrador por defecto
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO usuarios (username, password, nombre_completo, rol)
    VALUES (?, ?, ?, ?)
  `, ['admin', adminPassword, 'Administrador', 'admin'], (err) => {
    if (err) {
      console.error('Error creando admin:', err);
    } else {
      console.log('Usuario admin creado (username: admin, password: admin123)');
    }
  });

  // Crear usuario sistema por defecto
  const sistemaPassword = await bcrypt.hash('sistema123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO usuarios (username, password, nombre_completo, rol)
    VALUES (?, ?, ?, ?)
  `, ['sistema', sistemaPassword, 'Administrador de Sistemas', 'sistema'], (err) => {
    if (err) {
      console.error('Error creando sistema:', err);
    } else {
      console.log('Usuario sistema creado (username: sistema, password: sistema123)');
    }
  });

  // Crear médicos de ejemplo
  const medicoPassword = await bcrypt.hash('medico123', 10);
  
  const medicos = [
    ['dr.garcia', medicoPassword, 'Dr. Juan García', 'medico', 'Consultorio 1', 'Cardiología'],
    ['dra.lopez', medicoPassword, 'Dra. María López', 'medico', 'Consultorio 2', 'Pediatría'],
    ['dr.martinez', medicoPassword, 'Dr. Carlos Martínez', 'medico', 'Consultorio 3', 'Traumatología'],
    ['karina.stadler', medicoPassword, 'Karina Stadler', 'medico', 'Consultorio Externo', 'Consultorio Externo']
  ];

  medicos.forEach(medico => {
    db.run(`
      INSERT OR IGNORE INTO usuarios (username, password, nombre_completo, rol, consultorio, especialidad)
      VALUES (?, ?, ?, ?, ?, ?)
    `, medico, (err) => {
      if (err) {
        console.error('Error creando médico:', err);
      } else {
        console.log(`Médico creado: ${medico[2]} (username: ${medico[0]}, password: medico123)`);
      }
    });
  });

  // Crear turnos de ejemplo
  const today = new Date().toISOString().split('T')[0];
  const turnosEjemplo = [
    ['T001', 'Ana María González', '12345678', 2, 'Consultorio 1', today, '09:00', 'pendiente'],
    ['T002', 'Roberto Sánchez', '23456789', 2, 'Consultorio 1', today, '09:30', 'pendiente'],
    ['T003', 'Laura Fernández', '34567890', 3, 'Consultorio 2', today, '10:00', 'pendiente'],
    ['T004', 'Pedro Ramírez', '45678901', 3, 'Consultorio 2', today, '10:30', 'pendiente'],
    ['T005', 'Silvia Torres', '56789012', 4, 'Consultorio 3', today, '11:00', 'pendiente']
  ];

  turnosEjemplo.forEach(turno => {
    db.run(`
      INSERT INTO turnos (numero_turno, paciente_nombre, paciente_documento, medico_id, consultorio, fecha, hora, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, turno, (err) => {
      if (err) {
        console.error('Error creando turno:', err);
      }
    });
  });

  setTimeout(() => {
    console.log('\n✅ Base de datos inicializada correctamente');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Administrador:');
    console.log('  Usuario: admin');
    console.log('  Contraseña: admin123');
    console.log('\nMédicos:');
    console.log('  Usuario: dr.garcia   | Contraseña: medico123');
    console.log('  Usuario: dra.lopez   | Contraseña: medico123');
    console.log('  Usuario: dr.martinez | Contraseña: medico123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  }, 1000);
}

initDatabase();

