const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'settings.json');

const defaultConfig = {
  audio: {
    rate: 0.9,
    pitch: 1,
    voice: ''
  },
  horarios: {
    horaInicio: '08:00',
    horaFin: '17:00',
    intervalo: 30
  }
};

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
}

async function readConfig() {
  ensureConfigFile();
  try {
    const data = await fs.promises.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return mergeConfig(parsed || {});
  } catch (error) {
    console.error('Error leyendo configuración, usando valores por defecto', error);
    return { ...defaultConfig };
  }
}

function mergeConfig(config) {
  return {
    audio: {
      ...defaultConfig.audio,
      ...(config.audio || {})
    },
    horarios: {
      ...defaultConfig.horarios,
      ...(config.horarios || {})
    }
  };
}

async function writeConfig(config) {
  ensureConfigFile();
  const merged = mergeConfig(config);
  await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

async function getConfig() {
  return readConfig();
}

async function getAudioConfig() {
  const config = await readConfig();
  return config.audio;
}

async function updateAudioConfig(audioConfig = {}) {
  const config = await readConfig();
  config.audio = {
    ...config.audio,
    ...audioConfig
  };
  await writeConfig(config);
  return config.audio;
}

async function getHorariosConfig() {
  const config = await readConfig();
  return config.horarios;
}

async function updateHorariosConfig(horarioConfig = {}) {
  const config = await readConfig();
  config.horarios = {
    ...config.horarios,
    ...horarioConfig
  };
  await writeConfig(config);
  return config.horarios;
}

module.exports = {
  getConfig,
  getAudioConfig,
  updateAudioConfig,
  getHorariosConfig,
  updateHorariosConfig
};


