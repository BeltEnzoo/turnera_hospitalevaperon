const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/turnera.db');

console.log('Verificando usuarios en la base de datos...');

db.all('SELECT id, username, rol, nombre_completo FROM usuarios ORDER BY rol, username', (err, usuarios) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===');
    usuarios.forEach(usuario => {
      console.log(`ID: ${usuario.id} | Usuario: ${usuario.username} | Rol: ${usuario.rol} | Nombre: ${usuario.nombre_completo}`);
    });
    console.log('=====================================\n');
  }
  
  db.close();
});


