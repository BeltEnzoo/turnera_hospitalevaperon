const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  db.get(
    'SELECT * FROM usuarios WHERE username = ? AND activo = 1',
    [username],
    async (err, usuario) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const passwordValido = await bcrypt.compare(password, usuario.password);
      
      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        {
          id: usuario.id,
          username: usuario.username,
          rol: usuario.rol,
          nombre_completo: usuario.nombre_completo,
          consultorio: usuario.consultorio
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        usuario: {
          id: usuario.id,
          username: usuario.username,
          nombre_completo: usuario.nombre_completo,
          rol: usuario.rol,
          consultorio: usuario.consultorio,
          especialidad: usuario.especialidad
        }
      });
    }
  );
});

// Verificar token
router.get('/verify', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, usuario: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;



