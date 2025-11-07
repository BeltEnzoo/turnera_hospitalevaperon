const API_URL = window.location.origin + '/api';
let socket;
let synth = window.speechSynthesis;
let ultimoLlamado = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);
    
    conectarSocket();
    cargarHistorial();
});

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
    // Cancelar cualquier síntesis en progreso
    synth.cancel();
    
    // Formatear el consultorio para el audio
    let consultorioTexto = llamado.consultorio;
    
    // Si el consultorio es solo un número, agregar "Consultorio"
    if (/^\d+$/.test(consultorioTexto)) {
        consultorioTexto = `Consultorio ${consultorioTexto}`;
    }
    
    // Crear el mensaje de voz
    const texto = `${llamado.paciente_nombre}, ${consultorioTexto}`;
    
    // Repetir el llamado 2 veces
    setTimeout(() => hablar(texto), 500);
    setTimeout(() => hablar(texto), 4000);
}

function hablar(texto) {
    const utterance = new SpeechSynthesisUtterance(texto);
    
    // Configurar voz en español
    const voces = synth.getVoices();
    const vozEspanol = voces.find(v => v.lang.startsWith('es'));
    if (vozEspanol) {
        utterance.voice = vozEspanol;
    }
    
    utterance.lang = 'es-ES';
    utterance.rate = 0.9; // Velocidad ligeramente más lenta
    utterance.pitch = 1;
    utterance.volume = 1;
    
    synth.speak(utterance);
}

// Cargar voces (necesario en algunos navegadores)
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = () => {
        synth.getVoices();
    };
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


