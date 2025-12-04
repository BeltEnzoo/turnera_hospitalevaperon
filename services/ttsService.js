const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// Inicializar cliente de Google Cloud TTS
let ttsClient = null;

function initializeTTS() {
  // Si ya está inicializado, no hacer nada
  if (ttsClient) {
    return true;
  }

  // Solo inicializar si hay credenciales configuradas
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const config = {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      };
      
      // Si hay project ID configurado, agregarlo
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      }
      
      ttsClient = new textToSpeech.TextToSpeechClient(config);
      console.log('✅ Google Cloud TTS inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando Google Cloud TTS:', error.message);
      return false;
    }
  } else {
    // Intentar autenticación por defecto (Application Default Credentials)
    try {
      ttsClient = new textToSpeech.TextToSpeechClient();
      console.log('✅ Google Cloud TTS inicializado con credenciales por defecto');
      return true;
    } catch (error) {
      console.warn('⚠️ Google Cloud TTS no configurado. Configurar GOOGLE_APPLICATION_CREDENTIALS para usar voces naturales.');
      console.warn('   Sin configuración, se usará fallback (voz del navegador).');
      return false;
    }
  }
}

// Generar audio desde texto
async function generarAudio(texto, opciones = {}) {
  // Si no está inicializado o no hay cliente, devolver null para usar fallback
  if (!ttsClient && !initializeTTS()) {
    return null;
  }

  try {
    const configuracion = {
      input: { text: texto },
      voice: {
        languageCode: opciones.languageCode || 'es-AR', // Español argentino
        name: opciones.voiceName || 'es-AR-Wavenet-A', // Voz natural argentina
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: opciones.speakingRate || 0.9, // Velocidad normal
        pitch: opciones.pitch || 0, // Tono normal
        volumeGainDb: opciones.volumeGainDb || 0
      }
    };

    const [response] = await ttsClient.synthesizeSpeech(configuracion);
    
    // Crear directorio para audios si no existe
    const audioDir = path.join(__dirname, '..', 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const hash = texto.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `tts_${timestamp}_${hash}.mp3`;
    const filepath = path.join(audioDir, filename);

    // Guardar archivo de audio
    fs.writeFileSync(filepath, response.audioContent, 'binary');
    
    console.log(`✅ Audio generado: ${filename}`);
    
    return {
      url: `/audio/${filename}`,
      filepath: filepath,
      filename: filename
    };
  } catch (error) {
    console.error('❌ Error generando audio con Google Cloud TTS:', error.message);
    return null;
  }
}

// Limpiar archivos de audio antiguos (más de 1 hora)
function limpiarAudiosAntiguos() {
  try {
    const audioDir = path.join(__dirname, '..', 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      return;
    }

    const archivos = fs.readdirSync(audioDir);
    const ahora = Date.now();
    const unaHora = 60 * 60 * 1000; // 1 hora en milisegundos

    archivos.forEach(archivo => {
      const filepath = path.join(audioDir, archivo);
      const stats = fs.statSync(filepath);
      const edad = ahora - stats.mtimeMs;

      if (edad > unaHora) {
        fs.unlinkSync(filepath);
        console.log(`🗑️ Audio antiguo eliminado: ${archivo}`);
      }
    });
  } catch (error) {
    console.error('Error limpiando audios antiguos:', error.message);
  }
}

// Limpiar audios cada hora
setInterval(limpiarAudiosAntiguos, 60 * 60 * 1000);

module.exports = {
  generarAudio,
  initializeTTS,
  limpiarAudiosAntiguos
};
