const API_URL = window.location.origin + '/api';
let socket;
let synth = window.speechSynthesis;
let ultimoLlamado = null;
let vocesDisponibles = [];
let vocesCargadas = false;
let colaLlamados = [];
let reproduciendoLlamado = false;
let audioConfig = {
    rate: 0.9,
    pitch: 1,
    voice: ''
};

// Cargar voces disponibles
function cargarVoces() {
    vocesDisponibles = synth.getVoices();
    if (vocesDisponibles.length > 0) {
        vocesCargadas = true;
        console.log('Voces cargadas:', vocesDisponibles.length, vocesDisponibles.map(v => `${v.name} (${v.lang})`));
    } else {
        console.log('Esperando voces...');
        // Forzar carga de voces
        synth.getVoices();
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);
    
    // Cargar voces inmediatamente
    cargarVoces();
    
    // También escuchar cuando cambien las voces
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = () => {
            cargarVoces();
        };
    }
    
    // Forzar carga de voces después de un pequeño delay
    setTimeout(() => {
        cargarVoces();
    }, 1000);
    
    await cargarAudioConfig();
    conectarSocket();
    cargarHistorial();
});

async function cargarAudioConfig() {
    try {
        const response = await fetch(`${API_URL}/config/audio`);
        if (!response.ok) {
            throw new Error('Respuesta no válida');
        }
        const config = await response.json();
        if (typeof config.rate === 'number') {
            audioConfig.rate = config.rate;
        }
        if (typeof config.pitch === 'number') {
            audioConfig.pitch = config.pitch;
        }
        if (typeof config.voice === 'string') {
            audioConfig.voice = config.voice;
        }
    } catch (error) {
        console.warn('No se pudo cargar la configuración de audio, usando valores por defecto', error);
    }
}

function actualizarFechaHora() {
    const ahora = new Date();
    
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    document.getElementById('fecha').textContent = 
        ahora.toLocaleDateString('es-AR', opciones);
    
    document.getElementById('hora').textContent = 
        ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function conectarSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Display conectado');
        socket.emit('join-display');
    });

    socket.on('nuevo-llamado', (llamado) => {
        console.log('Nuevo llamado recibido:', llamado);
        mostrarLlamado(llamado);
        reproducirLlamado(llamado);
        agregarAlHistorial(llamado);
    });

    socket.on('disconnect', () => {
        console.log('Display desconectado');
    });
}

function mostrarLlamado(llamado) {
    const llamadoActual = document.getElementById('llamado-actual');
    const pacienteNombre = document.getElementById('paciente-nombre');
    const consultorioNumero = document.getElementById('consultorio-numero');
    
    // Añadir animación
    llamadoActual.classList.add('nuevo-llamado');
    setTimeout(() => llamadoActual.classList.remove('nuevo-llamado'), 1500);
    
    // Actualizar contenido
    pacienteNombre.textContent = llamado.paciente_nombre;
    consultorioNumero.textContent = llamado.consultorio;
    
    ultimoLlamado = llamado;
}

function reproducirLlamado(llamado) {
    // Formatear el consultorio para el audio
    let consultorioTexto = llamado.consultorio;
    
    // Si el consultorio es solo un número, agregar "Consultorio"
    if (/^\d+$/.test(consultorioTexto)) {
        consultorioTexto = `Consultorio ${consultorioTexto}`;
    }
    
    // Crear el mensaje de voz
    const texto = `Paciente ${llamado.paciente_nombre}, ${consultorioTexto}`;
    
    // Agregar a la cola en lugar de cancelar el actual
    colaLlamados.push({
        texto: texto,
        timestamp: Date.now()
    });
    
    // Si no se está reproduciendo nada, iniciar la reproducción de la cola
    if (!reproduciendoLlamado) {
        procesarColaLlamados();
    }
}

function procesarColaLlamados() {
    if (colaLlamados.length === 0) {
        reproduciendoLlamado = false;
        return;
    }
    
    reproduciendoLlamado = true;
    const llamado = colaLlamados.shift(); // Tomar el primer llamado de la cola
    
    // Reproducir el llamado 2 veces en secuencia
    hablar(llamado.texto)
        .then(() => {
            // Esperar un momento antes de repetir
            return new Promise(resolve => setTimeout(resolve, 1000));
        })
        .then(() => {
            // Segunda reproducción
            return hablar(llamado.texto);
        })
        .then(() => {
            // Esperar un momento antes del siguiente llamado
            return new Promise(resolve => setTimeout(resolve, 1000));
        })
        .then(() => {
            // Procesar el siguiente llamado en la cola
            procesarColaLlamados();
        });
}

function hablar(texto) {
    return new Promise((resolve) => {
        // Agregar un punto y espacio al inicio para evitar que espeak-ng corte la primera palabra
        // Es un workaround para un bug conocido de espeak-ng/speech-dispatcher
        // El punto ayuda a "anclar" el inicio del texto
        const textoConPrefijo = '. ' + texto;
        const utterance = new SpeechSynthesisUtterance(textoConPrefijo);
        
        // Si las voces no están cargadas, intentar cargarlas ahora
        if (!vocesCargadas || vocesDisponibles.length === 0) {
            cargarVoces();
        }
        
        // Usar las voces cargadas
        const voces = vocesDisponibles.length > 0 ? vocesDisponibles : synth.getVoices();
        
        // Debug: mostrar todas las voces disponibles
        if (voces.length > 0) {
            console.log('Voces disponibles:', voces.length, voces.map(v => `${v.name} (${v.lang})`));
        } else {
            console.warn('No hay voces disponibles todavía');
        }

        if (audioConfig.voice && voces.length > 0) {
            const vozConfigurada = voces.find(v =>
                v.name === audioConfig.voice || v.lang === audioConfig.voice
            );
            if (vozConfigurada) {
                utterance.voice = vozConfigurada;
                console.log('Usando voz configurada:', vozConfigurada.name, vozConfigurada.lang);
            }
        }

        if (!utterance.voice && voces.length > 0) {
            // Buscar voz en español de manera más agresiva (priorizar es-419, luego es-ES, luego cualquier es)
            let vozEspanol = voces.find(v => {
                const lang = (v.lang || '').toLowerCase();
                return lang === 'es-419' || lang === 'es-ar' || lang === 'es-latn';
            });
            
            if (!vozEspanol) {
                vozEspanol = voces.find(v => {
                    const lang = (v.lang || '').toLowerCase();
                    return lang === 'es-es' || lang === 'es';
                });
            }
            
            if (!vozEspanol) {
                vozEspanol = voces.find(v => {
                    const lang = (v.lang || '').toLowerCase();
                    const name = (v.name || '').toLowerCase();
                    return lang.startsWith('es') || 
                           name.includes('spanish') || 
                           name.includes('español');
                });
            }
            
            if (vozEspanol) {
                utterance.voice = vozEspanol;
                console.log('Usando voz en español encontrada:', vozEspanol.name, vozEspanol.lang);
            } else {
                console.warn('No se encontró voz en español, usando voz por defecto');
                // Usar la primera voz disponible como fallback
                if (voces.length > 0) {
                    utterance.voice = voces[0];
                }
            }
        }
        
        // Forzar idioma español latinoamericano si está disponible
        utterance.lang = (utterance.voice && utterance.voice.lang) || 'es-419';
        
        // Velocidad más lenta (0.7 aproximadamente equivale a -30 en spd-say)
        utterance.rate = typeof audioConfig.rate === 'number' ? (audioConfig.rate * 0.78) : 0.7;
        utterance.pitch = typeof audioConfig.pitch === 'number' ? audioConfig.pitch : 1;
        utterance.volume = 1;
        
        // Configurar eventos para saber cuándo termina
        utterance.onend = () => {
            resolve();
        };
        
        utterance.onerror = (event) => {
            console.error('Error en síntesis de voz:', event);
            resolve(); // Continuar aunque haya error
        };
        
        console.log('Reproduciendo:', texto, 'con voz:', utterance.voice ? utterance.voice.name : 'ninguna', 'idioma:', utterance.lang);
        synth.speak(utterance);
    });
}

async function cargarHistorial() {
    try {
        const response = await fetch(`${API_URL}/display/ultimos-llamados?limite=10`);
        const llamados = await response.json();
        
        const historialLista = document.getElementById('historial-lista');
        
        if (llamados.length === 0) {
            historialLista.innerHTML = '<div class="sin-datos">Esperando llamados...</div>';
            return;
        }
        
        historialLista.innerHTML = llamados.map(llamado => `
            <div class="historial-item">
                <span class="historial-paciente">${llamado.paciente_nombre}</span>
                <span class="historial-consultorio">${llamado.consultorio}</span>
                <span class="historial-hora">${formatearHora(llamado.llamado_at)}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

function agregarAlHistorial(llamado) {
    const historialLista = document.getElementById('historial-lista');
    
    // Remover mensaje "sin datos" si existe
    const sinDatos = historialLista.querySelector('.sin-datos');
    if (sinDatos) {
        sinDatos.remove();
    }
    
    const nuevoItem = document.createElement('div');
    nuevoItem.className = 'historial-item';
    nuevoItem.innerHTML = `
        <span class="historial-paciente">${llamado.paciente_nombre}</span>
        <span class="historial-consultorio">${llamado.consultorio}</span>
        <span class="historial-hora">${formatearHora(new Date())}</span>
    `;
    
    historialLista.insertBefore(nuevoItem, historialLista.firstChild);
    
    // Mantener solo los últimos 10
    const items = historialLista.querySelectorAll('.historial-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}


function formatearHora(fecha) {
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Mantener pantalla activa (evitar que se apague)
if ('wakeLock' in navigator) {
    let wakeLock = null;
    
    async function requestWakeLock() {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activado');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock liberado');
            });
        } catch (err) {
            console.error('Error con Wake Lock:', err);
        }
    }
    
    requestWakeLock();
    
    document.addEventListener('visibilitychange', () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });
}


