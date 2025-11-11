const express = require('express');
const router = express.Router();
const {
  getConfig,
  getAudioConfig,
  updateAudioConfig,
  getHorariosConfig,
  updateHorariosConfig
} = require('../services/configService');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

router.get('/audio', async (req, res) => {
  try {
    const audioConfig = await getAudioConfig();
    res.json(audioConfig);
  } catch (error) {
    console.error('Error obteniendo configuración de audio:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de audio' });
  }
});

router.post(
  '/audio',
  verificarToken,
  verificarRol('sistema', 'admin'),
  async (req, res) => {
    try {
      const { rate, pitch, voice } = req.body;
      const payload = {};

      if (typeof rate === 'number' && !Number.isNaN(rate)) {
        payload.rate = rate;
      }

      if (typeof pitch === 'number' && !Number.isNaN(pitch)) {
        payload.pitch = pitch;
      }

      if (typeof voice === 'string') {
        payload.voice = voice;
      }

      const updated = await updateAudioConfig(payload);
      res.json(updated);
    } catch (error) {
      console.error('Error guardando configuración de audio:', error);
      res.status(500).json({ error: 'Error guardando configuración de audio' });
    }
  }
);

router.get('/horarios', async (req, res) => {
  try {
    const horarios = await getHorariosConfig();
    res.json(horarios);
  } catch (error) {
    console.error('Error obteniendo configuración de horarios:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de horarios' });
  }
});

router.post(
  '/horarios',
  verificarToken,
  verificarRol('sistema', 'admin'),
  async (req, res) => {
    try {
      const { horaInicio, horaFin, intervalo } = req.body;
      const payload = {};

      if (typeof horaInicio === 'string') {
        payload.horaInicio = horaInicio;
      }

      if (typeof horaFin === 'string') {
        payload.horaFin = horaFin;
      }

      if (typeof intervalo === 'number' && !Number.isNaN(intervalo)) {
        payload.intervalo = intervalo;
      }

      const updated = await updateHorariosConfig(payload);
      res.json(updated);
    } catch (error) {
      console.error('Error guardando horarios:', error);
      res.status(500).json({ error: 'Error guardando horarios' });
    }
  }
);

module.exports = router;


