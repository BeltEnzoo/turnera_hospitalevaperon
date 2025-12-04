const express = require('express');
const router = express.Router();
const { generarAudio } = require('../services/ttsService');

// Generar audio desde texto
router.post('/generar', async (req, res) => {
  try {
    const { texto, languageCode, voiceName, speakingRate, pitch } = req.body;

    if (!texto || texto.trim() === '') {
      return res.status(400).json({ error: 'Texto requerido' });
    }

    const opciones = {
      languageCode: languageCode || 'es-AR',
      voiceName: voiceName || 'es-AR-Wavenet-A',
      speakingRate: speakingRate || 0.9,
      pitch: pitch || 0
    };

    const resultado = await generarAudio(texto, opciones);

    if (!resultado) {
      return res.status(500).json({ 
        error: 'No se pudo generar el audio. Verificar configuración de Google Cloud TTS.',
        fallback: true 
      });
    }

    res.json({
      url: resultado.url,
      filename: resultado.filename
    });
  } catch (error) {
    console.error('Error en ruta /api/tts/generar:', error);
    res.status(500).json({ 
      error: 'Error generando audio: ' + error.message,
      fallback: true 
    });
  }
});

module.exports = router;
