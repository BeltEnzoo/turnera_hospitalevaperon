const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/turnera.db');

async function crearUsuarioSistema() {
  console.log('Creando usuario sistema...');
  
  const sistemaPassword = await bcrypt.hash('sistema123', 10);
  
  db.run(`
    INSERT INTO usuarios (username, password, nombre_completo, rol)
    VALUES (?, ?, ?, ?)
  `, ['sistema', sistemaPassword, 'Administrador de Sistemas', 'sistema'], function(err) {
    if (err) {
      console.error('Error creando usuario sistema:', err);
    } else {
      console.log('✅ Usuario sistema creado exitosamente');
      console.log('Usuario: sistema');
      console.log('Contraseña: sistema123');
      console.log('Rol: sistema');
    }
    
    db.close();
  });
}

crearUsuarioSistema();


