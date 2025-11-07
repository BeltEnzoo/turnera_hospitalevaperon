const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let socket;
let medicoId;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        verificarToken();
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('filter-fecha').valueAsDate = new Date();
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.usuario.rol !== 'medico') {
                errorDiv.textContent = 'Acceso no autorizado. Solo médicos.';
                return;
            }

            token = data.token;
            medicoId = data.usuario.id;
            localStorage.setItem('token', token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            mostrarDashboard(data.usuario);
        } else {
            errorDiv.textContent = data.error || 'Error al iniciar sesión';
        }
    } catch (error) {
        errorDiv.textContent = 'Error de conexión';
        console.error('Error:', error);
    }
}

async function verificarToken() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            medicoId = data.usuario.id;
            const usuario = JSON.parse(localStorage.getItem('usuario'));
            mostrarDashboard(usuario);
        } else {
            logout();
        }
    } catch (error) {
        logout();
    }
}

function mostrarDashboard(usuario) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('medico-nombre').textContent = usuario.nombre_completo;
    document.getElementById('medico-consultorio').textContent = usuario.consultorio;
    
    conectarSocket();
    cargarEstadisticas();
    cargarTurnos();
}

function conectarSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Socket conectado');
        socket.emit('join-medico', medicoId);
    });

    socket.on('turno-actualizado', () => {
        cargarTurnos();
        cargarEstadisticas();
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    token = null;
    if (socket) socket.disconnect();
    location.reload();
}

async function cargarEstadisticas() {
    const fecha = document.getElementById('filter-fecha').value;
    
    try {
        console.log('🔍 Intentando cargar estadísticas para fecha:', fecha);
        console.log('🔍 URL:', `${API_URL}/medicos/estadisticas?fecha=${fecha}`);
        
        const response = await fetch(`${API_URL}/stats?medico_id=${medicoId}`, {
            credentials: 'omit'  // No enviar cookies ni headers de autenticación
        });

        console.log('🔍 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const stats = await response.json();
        console.log('🔍 Estadísticas recibidas:', stats);
        
        document.getElementById('stat-total').textContent = stats.total || 0;
        document.getElementById('stat-pendientes').textContent = stats.pendientes || 0;
        document.getElementById('stat-atendidos').textContent = stats.atendidos || 0;
        document.getElementById('stat-ausentes').textContent = stats.ausentes || 0;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function cargarTurnos() {
    const fecha = document.getElementById('filter-fecha').value;
    const container = document.getElementById('turnos-container');
    
    container.innerHTML = '<div class="loading">Cargando turnos...</div>';

    try {
        const response = await fetch(`${API_URL}/turnos/mis-turnos?fecha=${fecha}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const turnos = await response.json();

        if (turnos.length === 0) {
            container.innerHTML = `
                <div class="sin-turnos">
                    <div class="sin-turnos-icon">📋</div>
                    <p>No hay turnos para esta fecha</p>
                </div>
            `;
            return;
        }

        container.innerHTML = turnos.map(turno => crearTarjetaTurno(turno)).join('');
    } catch (error) {
        container.innerHTML = '<div class="loading">Error al cargar turnos</div>';
        console.error('Error:', error);
    }
}

function crearTarjetaTurno(turno) {
    const estadoClass = `estado-${turno.estado}`;
    const estadoLabel = turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1);
    
    let acciones = '';
    
    if (turno.estado === 'pendiente') {
        acciones = `
            <button class="btn btn-success" onclick="llamarPaciente(${turno.id})">
                📢 Llamar Paciente
            </button>
        `;
    } else if (turno.estado === 'llamado') {
        acciones = `
            <button class="btn btn-success" onclick="marcarAtendido(${turno.id})">
                ✅ Marcar Atendido
            </button>
            <button class="btn btn-danger" onclick="marcarAusente(${turno.id})">
                ❌ Marcar Ausente
            </button>
            <button class="btn btn-warning" onclick="llamarPaciente(${turno.id})">
                🔄 Volver a Llamar
            </button>
        `;
    }
    
    return `
        <div class="turno-card ${estadoClass}">
            <div class="turno-header">
                <span class="turno-numero">${turno.numero_turno}</span>
                <span class="turno-hora">${turno.hora}</span>
            </div>
            <div class="turno-paciente">${turno.paciente_nombre}</div>
            ${turno.paciente_documento ? `<div class="turno-documento">DNI: ${turno.paciente_documento}</div>` : ''}
            <div class="turno-estado ${turno.estado}">${estadoLabel}</div>
            ${turno.observaciones ? `<div class="turno-observaciones"><strong>Obs:</strong> ${turno.observaciones}</div>` : ''}
            <div class="turno-acciones">
                ${acciones}
            </div>
        </div>
    `;
}

async function llamarPaciente(turnoId) {
    try {
        const response = await fetch(`${API_URL}/turnos/${turnoId}/llamar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            // Mostrar notificación visual
            mostrarNotificacion('✅ Paciente llamado exitosamente', 'success');
            
            // Recargar datos con un pequeño delay para asegurar que la BD se actualizó
            setTimeout(() => {
                cargarTurnos();
                cargarEstadisticas();
            }, 500);
        } else {
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al llamar paciente', 'error');
        console.error('Error:', error);
    }
}

async function marcarAtendido(turnoId) {
    await cambiarEstado(turnoId, 'atendido');
}

async function marcarAusente(turnoId) {
    if (confirm('¿Está seguro que el paciente no asistió?')) {
        await cambiarEstado(turnoId, 'ausente');
    }
}

async function cambiarEstado(turnoId, estado) {
    try {
        const response = await fetch(`${API_URL}/turnos/${turnoId}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarNotificacion('✅ Estado actualizado', 'success');
            
            // Recargar datos con un pequeño delay
            setTimeout(() => {
                cargarTurnos();
                cargarEstadisticas();
            }, 500);
        } else {
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al actualizar estado', 'error');
        console.error('Error:', error);
    }
}

function mostrarNotificacion(mensaje, tipo) {
    // Crear notificación toast simple
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 20px 30px;
        background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

