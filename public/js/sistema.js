const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        verificarToken();
    }

    // Event listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('medico-form').addEventListener('submit', handleMedicoSubmit);
    
    // Fecha por defecto
    document.getElementById('filter-fecha-turnos').valueAsDate = new Date();
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
            if (data.usuario.rol !== 'sistema') {
                errorDiv.textContent = 'Acceso no autorizado. Solo administradores de sistemas.';
                return;
            }

            token = data.token;
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
            const usuario = JSON.parse(localStorage.getItem('usuario'));
            if (usuario && usuario.rol === 'sistema') {
                mostrarDashboard(usuario);
            } else {
                logout();
            }
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
    document.getElementById('user-name').textContent = usuario.nombre_completo;
    
    cargarMedicos();
    cargarTurnos();
    cargarEstadisticas();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    token = null;
    location.reload();
}

function showTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el tab seleccionado
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos del tab seleccionado
    if (tabName === 'medicos') {
        cargarMedicos();
    } else if (tabName === 'turnos') {
        cargarTurnos();
    } else if (tabName === 'database') {
        // Cargar la primera subpestaña de base de datos
        cargarDbUsuarios();
    } else if (tabName === 'config') {
        cargarConfiguracion();
    } else if (tabName === 'reportes') {
        cargarReportes();
    }
}

// Configuración del Sistema
async function cargarConfiguracion() {
    console.log('Cargando configuración del sistema...');
    try {
        const response = await fetch(`${API_URL}/config`);
        if (!response.ok) {
            throw new Error('Respuesta no válida');
        }
        const data = await response.json();

        if (data.audio) {
            const rateField = document.getElementById('audio-rate');
            const pitchField = document.getElementById('audio-pitch');

            if (rateField) {
                rateField.value = String(data.audio.rate ?? 0.9);
            }

            if (pitchField) {
                pitchField.value = String(data.audio.pitch ?? 1);
            }
        }

        if (data.horarios) {
            const inicioField = document.getElementById('hora-inicio');
            const finField = document.getElementById('hora-fin');
            const intervaloField = document.getElementById('intervalo-turnos');

            if (inicioField) {
                inicioField.value = data.horarios.horaInicio || '08:00';
            }

            if (finField) {
                finField.value = data.horarios.horaFin || '17:00';
            }

            if (intervaloField) {
                intervaloField.value = data.horarios.intervalo ?? 30;
            }
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        mostrarNotificacion('❌ No se pudo cargar la configuración', 'error');
    }
}

function cargarReportes() {
    console.log('Cargando reportes...');
    cargarFiltrosReportes();
    cargarDatosReportes();
}

async function cargarFiltrosReportes() {
    try {
        // Cargar especialidades
        const responseEspecialidades = await fetch(`${API_URL}/medicos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const medicos = await responseEspecialidades.json();
        
        const especialidades = [...new Set(medicos.map(m => m.especialidad).filter(e => e))];
        const selectEspecialidad = document.getElementById('filter-especialidad');
        selectEspecialidad.innerHTML = '<option value="">Todas las especialidades</option>';
        especialidades.forEach(esp => {
            selectEspecialidad.innerHTML += `<option value="${esp}">${esp}</option>`;
        });
        
        // Cargar médicos
        const selectMedico = document.getElementById('filter-medico');
        selectMedico.innerHTML = '<option value="">Todos los médicos</option>';
        medicos.forEach(medico => {
            selectMedico.innerHTML += `<option value="${medico.id}">${medico.nombre_completo}</option>`;
        });
        
    } catch (error) {
        console.error('Error cargando filtros:', error);
    }
}

async function cargarDatosReportes() {
    try {
        const response = await fetch(`${API_URL}/reportes-stats`);
        const datos = await response.json();
        
        // Actualizar estadísticas (con verificación de existencia)
        const elementos = {
            'total-medicos': datos.medicos_activos || 0,
            'total-turnos': datos.total_turnos || 0,
            'turnos-pendientes': datos.turnos_pendientes || 0,
            'turnos-atendidos': datos.turnos_atendidos || 0,
            'turnos-ausentes': datos.turnos_ausentes || 0,
            'total-llamados': datos.total_llamados || 0
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            } else {
                console.warn(`Elemento con ID '${id}' no encontrado`);
            }
        });
        
        // Cargar gráfico de especialidades
        cargarGraficoEspecialidades(datos.especialidades || []);
        
    } catch (error) {
        console.error('Error cargando datos de reportes:', error);
    }
}

function cargarGraficoEspecialidades(especialidades) {
    const container = document.getElementById('especialidades-chart');
    
    if (especialidades.length === 0) {
        container.innerHTML = '<div class="no-data">No hay datos disponibles</div>';
        return;
    }
    
    const html = especialidades.map(esp => `
        <div class="especialidad-item">
            <div class="especialidad-nombre">${esp.nombre}</div>
            <div class="especialidad-stats">
                <span class="stat">Turnos: ${esp.turnos}</span>
                <span class="stat">Atendidos: ${esp.atendidos}</span>
                <span class="stat">Pendientes: ${esp.pendientes}</span>
            </div>
            <div class="especialidad-bar">
                <div class="bar-fill" style="width: ${(esp.atendidos / esp.turnos * 100) || 0}%"></div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function aplicarFiltrosReportes() {
    const mes = document.getElementById('filter-mes').value;
    const especialidad = document.getElementById('filter-especialidad').value;
    const medico = document.getElementById('filter-medico').value;
    
    console.log('Aplicando filtros:', { mes, especialidad, medico });
    cargarDatosReportesFiltrados(mes, especialidad, medico);
}

function limpiarFiltrosReportes() {
    document.getElementById('filter-mes').value = '';
    document.getElementById('filter-especialidad').value = '';
    document.getElementById('filter-medico').value = '';
    cargarDatosReportes();
}

async function cargarDatosReportesFiltrados(mes, especialidad, medico) {
    try {
        const params = new URLSearchParams();
        if (mes) params.append('mes', mes);
        if (especialidad) params.append('especialidad', especialidad);
        if (medico) params.append('medico', medico);
        
        const response = await fetch(`${API_URL}/database/estadisticas?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const datos = await response.json();
        
        // Actualizar estadísticas con filtros aplicados
        document.getElementById('total-medicos').textContent = datos.medicos_activos || 0;
        document.getElementById('total-turnos').textContent = datos.total_turnos || 0;
        document.getElementById('turnos-pendientes').textContent = datos.turnos_pendientes || 0;
        document.getElementById('turnos-atendidos').textContent = datos.turnos_atendidos || 0;
        document.getElementById('turnos-ausentes').textContent = datos.turnos_ausentes || 0;
        document.getElementById('total-llamados').textContent = datos.total_llamados || 0;
        
        cargarGraficoEspecialidades(datos.especialidades || []);
        
    } catch (error) {
        console.error('Error cargando datos filtrados:', error);
    }
}

function generarReporteEspecialidad() {
    console.log('Generando reporte por especialidad...');
    // Implementar generación de reporte
}

// Gestión de Médicos
async function cargarMedicos() {
    try {
        const response = await fetch(`${API_URL}/medicos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const medicos = await response.json();
        
        const tbody = document.getElementById('medicos-tbody');
        
        if (medicos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay médicos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = medicos.map(medico => `
            <tr>
                <td>${medico.id}</td>
                <td>${medico.username}</td>
                <td>${medico.nombre_completo}</td>
                <td>${medico.consultorio || '-'}</td>
                <td>${medico.especialidad || '-'}</td>
                <td><span class="badge ${medico.activo ? 'badge-activo' : 'badge-inactivo'}">${medico.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editarMedico(${medico.id})">✏️</button>
                    <button class="action-btn delete" onclick="eliminarMedico(${medico.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando médicos:', error);
        document.getElementById('medicos-tbody').innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar médicos</td></tr>';
    }
}

async function cargarTurnos() {
    const fecha = document.getElementById('filter-fecha-turnos').value;
    
    try {
        let url = `${API_URL}/turnos`;
        if (fecha) url += `?fecha=${fecha}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const turnos = await response.json();
        
        const tbody = document.getElementById('turnos-tbody');
        
        if (turnos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay turnos para esta fecha</td></tr>';
            return;
        }

        tbody.innerHTML = turnos.map(turno => `
            <tr>
                <td>${turno.numero_turno}</td>
                <td>${turno.paciente_nombre}</td>
                <td>${turno.paciente_documento || '-'}</td>
                <td>${turno.medico_nombre || '-'}</td>
                <td>${turno.consultorio}</td>
                <td>${formatearFecha(turno.fecha)}</td>
                <td>${turno.hora}</td>
                <td><span class="badge badge-${turno.estado}">${turno.estado}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editarTurno(${turno.id})">✏️</button>
                    <button class="action-btn delete" onclick="eliminarTurno(${turno.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando turnos:', error);
        document.getElementById('turnos-tbody').innerHTML = '<tr><td colspan="9" class="text-center">Error al cargar turnos</td></tr>';
    }
}

async function cargarEstadisticas() {
    try {
        // Cargar estadísticas del día
        const hoy = new Date().toISOString().split('T')[0];
        
        const [medicosRes, turnosRes, llamadosRes] = await Promise.all([
            fetch(`${API_URL}/medicos`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/turnos?fecha=${hoy}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/display/ultimos-llamados?limite=100`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const medicos = await medicosRes.json();
        const turnos = await turnosRes.json();
        const llamados = await llamadosRes.json();

        // Solo actualizar si los elementos existen (para evitar errores)
        const totalMedicos = document.getElementById('total-medicos');
        const totalTurnos = document.getElementById('total-turnos');
        const turnosAtendidos = document.getElementById('turnos-atendidos');
        const totalLlamados = document.getElementById('total-llamados');
        
        if (totalMedicos) totalMedicos.textContent = medicos.filter(m => m.activo).length;
        if (totalTurnos) totalTurnos.textContent = turnos.length;
        if (turnosAtendidos) turnosAtendidos.textContent = turnos.filter(t => t.estado === 'atendido').length;
        if (totalLlamados) totalLlamados.textContent = llamados.length;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Gestión de Médicos - Modal
function mostrarFormularioMedico(medico = null) {
    const modal = document.getElementById('medico-modal');
    const form = document.getElementById('medico-form');
    
    if (medico) {
        document.getElementById('modal-title').textContent = 'Editar Médico';
        document.getElementById('medico-id').value = medico.id;
        document.getElementById('medico-username').value = medico.username;
        document.getElementById('medico-password').value = '';
        document.getElementById('medico-password').required = false;
        document.getElementById('medico-nombre').value = medico.nombre_completo;
        document.getElementById('medico-consultorio').value = medico.consultorio || '';
        document.getElementById('medico-especialidad').value = medico.especialidad || '';
    } else {
        document.getElementById('modal-title').textContent = 'Nuevo Médico';
        form.reset();
        document.getElementById('medico-password').required = true;
    }
    
    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('medico-modal').style.display = 'none';
    document.getElementById('medico-form').reset();
}

async function handleMedicoSubmit(e) {
    e.preventDefault();
    
    const medicoData = {
        username: document.getElementById('medico-username').value,
        password: document.getElementById('medico-password').value,
        nombre_completo: document.getElementById('medico-nombre').value,
        consultorio: document.getElementById('medico-consultorio').value,
        especialidad: document.getElementById('medico-especialidad').value,
        rol: 'medico'
    };

    const medicoId = document.getElementById('medico-id').value;
    const isEdit = medicoId !== '';

    try {
        let response;
        if (isEdit) {
            // Actualizar médico existente
            response = await fetch(`${API_URL}/medicos/${medicoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(medicoData)
            });
        } else {
            // Crear nuevo médico
            response = await fetch(`${API_URL}/medicos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(medicoData)
            });
        }

        const data = await response.json();

        if (response.ok) {
            mostrarNotificacion('✅ Médico guardado exitosamente', 'success');
            cerrarModal();
            cargarMedicos();
        } else {
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al guardar médico', 'error');
        console.error('Error:', error);
    }
}

async function editarMedico(id) {
    try {
        const response = await fetch(`${API_URL}/medicos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const medico = await response.json();
            mostrarFormularioMedico(medico);
        } else {
            mostrarNotificacion('❌ Error al cargar médico', 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al cargar médico', 'error');
        console.error('Error:', error);
    }
}

async function eliminarMedico(id) {
    if (!confirm('¿Está seguro que desea eliminar este médico?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/medicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            mostrarNotificacion('✅ Médico eliminado exitosamente', 'success');
            cargarMedicos();
        } else {
            const data = await response.json();
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al eliminar médico', 'error');
        console.error('Error:', error);
    }
}

// Gestión de Turnos
async function eliminarTurno(id) {
    if (!confirm('¿Está seguro que desea eliminar este turno?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/turnos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            mostrarNotificacion('✅ Turno eliminado exitosamente', 'success');
            cargarTurnos();
        } else {
            const data = await response.json();
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al eliminar turno', 'error');
        console.error('Error:', error);
    }
}

async function limpiarTurnos() {
    const fecha = document.getElementById('filter-fecha-turnos').value;
    
    if (!fecha) {
        mostrarNotificacion('❌ Seleccione una fecha para limpiar', 'error');
        return;
    }

    if (!confirm(`¿Está seguro que desea eliminar TODOS los turnos del ${formatearFecha(fecha)}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/turnos/limpiar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fecha })
        });

        if (response.ok) {
            mostrarNotificacion('✅ Turnos eliminados exitosamente', 'success');
            cargarTurnos();
            cargarEstadisticas();
        } else {
            const data = await response.json();
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al limpiar turnos', 'error');
        console.error('Error:', error);
    }
}

// Configuración
async function guardarConfigAudio() {
    try {
        const payload = {
            rate: parseFloat(document.getElementById('audio-rate').value),
            pitch: parseFloat(document.getElementById('audio-pitch').value)
        };

        const response = await fetch(`${API_URL}/config/audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error guardando configuración de audio');
        }

        mostrarNotificacion('✅ Configuración de audio guardada', 'success');
    } catch (error) {
        console.error('Error guardando configuración de audio:', error);
        mostrarNotificacion('❌ Error al guardar configuración de audio', 'error');
    }
}

async function guardarConfigHorarios() {
    try {
        const payload = {
            horaInicio: document.getElementById('hora-inicio').value,
            horaFin: document.getElementById('hora-fin').value,
            intervalo: parseInt(document.getElementById('intervalo-turnos').value)
        };

        const response = await fetch(`${API_URL}/config/horarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error guardando horarios');
        }

        mostrarNotificacion('✅ Configuración de horarios guardada', 'success');
    } catch (error) {
        console.error('Error guardando horarios:', error);
        mostrarNotificacion('❌ Error al guardar horarios', 'error');
    }
}

// Reportes
function generarReporteDiario() {
    const fecha = document.getElementById('filter-fecha-turnos').value || new Date().toISOString().split('T')[0];
    mostrarNotificacion('📄 Generando reporte diario...', 'info');
    // Aquí se implementaría la generación del reporte
}

function generarReporteMensual() {
    mostrarNotificacion('📊 Generando reporte mensual...', 'info');
    // Aquí se implementaría la generación del reporte
}

function exportarDatos() {
    mostrarNotificacion('💾 Exportando datos...', 'info');
    // Aquí se implementaría la exportación de datos
}

// Utilidades
function formatearFecha(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR');
}

// Base de Datos - Variables globales
let autoRefreshInterval = null;
let isAutoRefreshActive = false;

// Base de Datos - Funciones
function showDbTab(tabName) {
    // Ocultar todos los tabs de DB
    document.querySelectorAll('.db-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.db-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el tab seleccionado
    document.getElementById(`db-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos del tab seleccionado
    if (tabName === 'usuarios') {
        cargarDbUsuarios();
    } else if (tabName === 'turnos') {
        cargarDbTurnos();
    } else if (tabName === 'historial') {
        cargarDbHistorial();
    } else if (tabName === 'estadisticas') {
        cargarDbEstadisticas();
    }
}

async function cargarDbUsuarios() {
    try {
        const response = await fetch(`${API_URL}/medicos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const medicos = await response.json();
        
        // También obtener usuarios admin y sistema
        const response2 = await fetch(`${API_URL}/database/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const usuarios = await response2.json();
        
        const tbody = document.getElementById('db-usuarios-tbody');
        
        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay usuarios</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(usuario => `
            <tr>
                <td>${usuario.id}</td>
                <td>${usuario.username}</td>
                <td>${usuario.nombre_completo}</td>
                <td><span class="badge badge-${usuario.rol === 'admin' ? 'activo' : usuario.rol === 'sistema' ? 'activo' : 'activo'}">${usuario.rol}</span></td>
                <td>${usuario.consultorio || '-'}</td>
                <td>${usuario.especialidad || '-'}</td>
                <td><span class="status-indicator status-${usuario.activo ? 'activo' : 'inactivo'}"></span>${usuario.activo ? 'Activo' : 'Inactivo'}</td>
                <td>${formatearFecha(usuario.created_at)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        document.getElementById('db-usuarios-tbody').innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar usuarios</td></tr>';
    }
}

async function cargarDbTurnos() {
    try {
        const response = await fetch(`${API_URL}/turnos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const turnos = await response.json();
        
        const tbody = document.getElementById('db-turnos-tbody');
        
        if (turnos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No hay turnos</td></tr>';
            return;
        }

        tbody.innerHTML = turnos.map(turno => `
            <tr>
                <td>${turno.id}</td>
                <td>${turno.numero_turno}</td>
                <td>${turno.paciente_nombre}</td>
                <td>${turno.paciente_documento || '-'}</td>
                <td>${turno.medico_id}</td>
                <td>${turno.consultorio}</td>
                <td>${formatearFecha(turno.fecha)}</td>
                <td>${turno.hora}</td>
                <td><span class="status-indicator status-${turno.estado}"></span>${turno.estado}</td>
                <td>${turno.llamado_at ? new Date(turno.llamado_at).toLocaleString('es-AR') : '-'}</td>
                <td>${turno.atendido_at ? new Date(turno.atendido_at).toLocaleString('es-AR') : '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando turnos:', error);
        document.getElementById('db-turnos-tbody').innerHTML = '<tr><td colspan="11" class="text-center">Error al cargar turnos</td></tr>';
    }
}

async function cargarDbHistorial() {
    try {
        const response = await fetch(`${API_URL}/display/ultimos-llamados?limite=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const historial = await response.json();
        
        const tbody = document.getElementById('db-historial-tbody');
        
        if (historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay historial</td></tr>';
            return;
        }

        tbody.innerHTML = historial.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${item.turno_id}</td>
                <td>${item.medico_id}</td>
                <td>${item.paciente_nombre}</td>
                <td>${item.consultorio}</td>
                <td>${new Date(item.llamado_at).toLocaleString('es-AR')}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando historial:', error);
        document.getElementById('db-historial-tbody').innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar historial</td></tr>';
    }
}

async function cargarDbEstadisticas() {
    try {
        const [usuariosRes, turnosRes, historialRes] = await Promise.all([
            fetch(`${API_URL}/database/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/turnos`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/display/ultimos-llamados?limite=1000`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const usuarios = await usuariosRes.json();
        const turnos = await turnosRes.json();
        const historial = await historialRes.json();

        document.getElementById('db-total-usuarios').textContent = usuarios.length;
        document.getElementById('db-total-medicos').textContent = usuarios.filter(u => u.rol === 'medico').length;
        document.getElementById('db-total-turnos').textContent = turnos.length;
        document.getElementById('db-total-historial').textContent = historial.length;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function actualizarBaseDatos() {
    const activeTab = document.querySelector('.db-tab-content.active');
    if (activeTab) {
        const tabId = activeTab.id;
        if (tabId === 'db-usuarios') cargarDbUsuarios();
        else if (tabId === 'db-turnos') cargarDbTurnos();
        else if (tabId === 'db-historial') cargarDbHistorial();
        else if (tabId === 'db-estadisticas') cargarDbEstadisticas();
    }
    mostrarNotificacion('🔄 Base de datos actualizada', 'success');
}

function toggleAutoRefresh() {
    const button = event.target.closest('button');
    const textSpan = document.getElementById('auto-refresh-text');
    
    if (isAutoRefreshActive) {
        clearInterval(autoRefreshInterval);
        isAutoRefreshActive = false;
        button.classList.remove('auto-refresh-active');
        textSpan.textContent = '▶️ Auto-actualización';
        mostrarNotificacion('⏸️ Auto-actualización desactivada', 'info');
    } else {
        autoRefreshInterval = setInterval(actualizarBaseDatos, 5000); // Cada 5 segundos
        isAutoRefreshActive = true;
        button.classList.add('auto-refresh-active');
        textSpan.textContent = '⏸️ Auto-actualización';
        mostrarNotificacion('▶️ Auto-actualización activada (cada 5 segundos)', 'success');
    }
}

function filtrarDbTurnos() {
    // Implementar filtros específicos para turnos
    cargarDbTurnos();
}

function limpiarBaseDatos() {
    if (!confirm('⚠️ ¿Está seguro que desea limpiar TODA la base de datos? Esta acción no se puede deshacer.')) {
        return;
    }
    
    if (!confirm('🚨 CONFIRMACIÓN FINAL: Esto eliminará TODOS los datos. ¿Continuar?')) {
        return;
    }
    
    mostrarNotificacion('🧹 Limpiando base de datos...', 'info');
    // Aquí se implementaría la limpieza completa
}

function exportarBaseDatos() {
    mostrarNotificacion('💾 Exportando base de datos...', 'info');
    // Aquí se implementaría la exportación
}

function optimizarBaseDatos() {
    mostrarNotificacion('⚡ Optimizando base de datos...', 'info');
    // Aquí se implementaría la optimización
}

function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 20px 30px;
        background: ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#17a2b8'};
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
