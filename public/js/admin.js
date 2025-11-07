const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let medicos = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        verificarToken();
    }

    // Event listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('pdf-file').addEventListener('change', handleFileUpload);
    document.getElementById('crear-turno-form').addEventListener('submit', handleCrearTurno);
    
    // Drag and drop
    const uploadArea = document.getElementById('upload-area');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#cbd5e0';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#cbd5e0';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            document.getElementById('pdf-file').files = e.dataTransfer.files;
            handleFileUpload();
        }
    });

    // Fecha por defecto
    const hoy = new Date();
    document.getElementById('filter-fecha').valueAsDate = hoy;
    document.getElementById('fecha').valueAsDate = hoy;
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
            if (data.usuario.rol !== 'admin') {
                errorDiv.textContent = 'Acceso no autorizado. Solo administradores.';
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
    document.getElementById('user-name').textContent = usuario.nombre_completo;
    
    cargarMedicos();
    cargarTurnos();
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
}

async function handleFileUpload() {
    const fileInput = document.getElementById('pdf-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const resultDiv = document.getElementById('upload-result');
    resultDiv.innerHTML = '<p>Procesando PDF...</p>';

    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch(`${API_URL}/turnos/upload-pdf`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <h4>✅ PDF procesado exitosamente</h4>
                    <p>${data.message}</p>
                    <p>Turnos insertados: ${data.insertados}</p>
                    ${data.errores > 0 ? `<p>Errores: ${data.errores}</p>` : ''}
                </div>
            `;
            cargarTurnos();
        } else {
            resultDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-message">Error al procesar PDF</div>`;
        console.error('Error:', error);
    }

    fileInput.value = '';
}

async function cargarMedicos() {
    try {
        const response = await fetch(`${API_URL}/medicos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        medicos = await response.json();
        
        const select = document.getElementById('medico_id');
        select.innerHTML = '<option value="">Seleccione un médico</option>';
        
        medicos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = `${medico.nombre_completo} - ${medico.consultorio}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando médicos:', error);
    }
}

async function cargarTurnos() {
    const fecha = document.getElementById('filter-fecha').value;
    const estado = document.getElementById('filter-estado').value;
    
    const tbody = document.getElementById('turnos-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando...</td></tr>';

    try {
        let url = `${API_URL}/turnos?`;
        if (fecha) url += `fecha=${fecha}&`;
        if (estado) url += `estado=${estado}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const turnos = await response.json();

        if (turnos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay turnos</td></tr>';
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
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar turnos</td></tr>';
        console.error('Error:', error);
    }
}

async function handleCrearTurno(e) {
    e.preventDefault();

    const turnoData = {
        numero_turno: document.getElementById('numero_turno').value,
        paciente_nombre: document.getElementById('paciente_nombre').value,
        paciente_documento: document.getElementById('paciente_documento').value,
        medico_id: document.getElementById('medico_id').value,
        consultorio: document.getElementById('consultorio').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        observaciones: document.getElementById('observaciones').value
    };

    try {
        const response = await fetch(`${API_URL}/turnos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(turnoData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Turno creado exitosamente');
            e.target.reset();
            document.getElementById('fecha').valueAsDate = new Date();
            cargarTurnos();
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        alert('❌ Error al crear turno');
        console.error('Error:', error);
    }
}

function formatearFecha(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR');
}

