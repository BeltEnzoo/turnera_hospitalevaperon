const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/turnera.db');

async function arreglarBaseDatos() {
  console.log('Arreglando base de datos para permitir rol sistema...');
  
  // Primero, eliminar la restricción CHECK existente
  db.run(`
    CREATE TABLE usuarios_nueva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre_completo TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('admin', 'medico', 'sistema')),
      consultorio TEXT,
      especialidad TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creando tabla nueva:', err);
      return;
    }
    
    console.log('✅ Tabla nueva creada');
    
    // Copiar datos de la tabla vieja a la nueva
    db.run(`
      INSERT INTO usuarios_nueva (id, username, password, nombre_completo, rol, consultorio, especialidad, activo, created_at)
      SELECT id, username, password, nombre_completo, rol, consultorio, especialidad, activo, created_at
      FROM usuarios
    `, (err) => {
      if (err) {
        console.error('Error copiando datos:', err);
        return;
      }
      
      console.log('✅ Datos copiados');
      
      // Eliminar tabla vieja
      db.run('DROP TABLE usuarios', (err) => {
        if (err) {
          console.error('Error eliminando tabla vieja:', err);
          return;
        }
        
        console.log('✅ Tabla vieja eliminada');
        
        // Renombrar tabla nueva
        db.run('ALTER TABLE usuarios_nueva RENAME TO usuarios', (err) => {
          if (err) {
            console.error('Error renombrando tabla:', err);
            return;
          }
          
          console.log('✅ Tabla renombrada');
          
          // Ahora crear el usuario sistema
          crearUsuarioSistema();
        });
      });
    });
  });
}

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

arreglarBaseDatos();


