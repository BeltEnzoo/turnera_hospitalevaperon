const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/turnera.db');

console.log('Limpiando turnos...');

db.run('DELETE FROM turnos', (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('✅ Turnos eliminados exitosamente');
  }
  
  db.close();
});


