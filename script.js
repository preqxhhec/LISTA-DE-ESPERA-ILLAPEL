//SEGMENTO 1 (Configuración + Utilidades)

/// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
    apiKey: "AIzaSyCLyDSiBtHs3X0OfdkNHZZslmAuZSfmI0A",
    authDomain: "hospital-illapel-prequirurgico.firebaseapp.com",
    databaseURL: "https://hospital-illapel-prequirurgico-default-rtdb.firebaseio.com",
    projectId: "hospital-illapel-prequirurgico",
    storageBucket: "hospital-illapel-prequirurgico.firebasestorage.app",
    messagingSenderId: "116781822974",
    appId: "1:116781822974:web:3f9dd916f357a31b4a86af"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let patients = [];
let currentPatientKey = null;
let currentModalPatient = null;

// Especialistas
const especialistas = {
    "CIRUGIA GENERAL": ["DR. ANTONIO PAUSIN MUÑOZ", "DR. JUAN VAILATI LOPEZ", "DR. HENDER RINCON OLAVEZ", "DR. ALEXIS ORDAZ GONZALEZ", "DRA. FATIMA TINOCO HURTADO", "OTRO"],
    "CIRUGIA INFANTIL": ["DRA. LORENA ANGEL GALLARDO", "DRA. MARIA JARA VALDIVIA", "OTRO"],
    "GINECOLOGIA": ["DR. MIGUEL MOYA GONZALEZ", "DRA. JESSIE NEUMANN RUIZ", "DRA. ALIANY LEZAMA GUERRA", "DRA. AMANDA POBLETE REQUENA", "DRA. CELSA PEREZ SCOTT", "DR. MIGUEL CARRILLO AGUIRRE", "DRA. MARIA DURAN MONASTERIO", "OTRO"],
    "MAXILOFACIAL": ["DR. JAVIER VENEGAS RIQUELME", "DR. HECTOR REYES RODRIGUEZ", "DR. SEBASTIAN GUTIERREZ ZUÑIGA", "DRA. LORENA SAAVEDRA BARRAZA", "OTRO"],
    "OFTALMOLOGIA": ["DRA. MARIA SEQUERA LAMPER", "DRA. NAIRIM SANDOVAL NAVEDA", "OTRO"],
    "ORL": ["DR. ORLANDO DAWAHRE ACEVEDO", "DRA. MADELEIN MACHADO DELGADO", "OTRO"],
    "TRAUMATOLOGIA": ["DR. JESUS SAYEGLE CHAMI", "DRA. DOUGMAI CAMACARO HERNANDEZ", "OTRO"],
    "UROLOGIA": ["DR. LUIS HERNANDEZ VARGAS", "OTRO"]
};

// ====================== UTILIDADES ======================
function calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function calculateWaitingDays(startDate) {
    if (!startDate) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(startDate);
    return Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24));
}

function filterMedicos() {
    const especialidad = document.getElementById('especialidad').value;
    const medicoSelect = document.getElementById('medicoTratante');
    medicoSelect.innerHTML = '<option value="">Seleccionar Médico</option>';
    if (especialistas[especialidad]) {
        especialistas[especialidad].forEach(med => {
            const opt = document.createElement('option');
            opt.value = med; opt.textContent = med;
            medicoSelect.appendChild(opt);
        });
    }
}

// ====================== FORMATEO DE RUT CHILENO ======================
// ====================== FORMATEO DE RUT CHILENO (VERSIÓN SEGURA) ======================
function formatRut(rut) {
    if (!rut) return '';

    // Convertir a string por si viene como número o null
    let cleanRut = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();

    if (cleanRut.length === 0) return '';
    if (cleanRut.length < 7) return cleanRut;

    // Separar dígito verificador
    const dv = cleanRut.slice(-1);
    let numero = cleanRut.slice(0, -1);

    // Agregar puntos
    numero = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${numero}-${dv}`;
}

// Función para validar RUT (opcional pero útil)
function validarRut(rut) {
    // Implementación básica
    return rut && rut.length >= 8;
}

//SEGMENTO 2 (Login / Register / Logout)

// ====================== LOGIN / REGISTER ======================
function showLogin() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('registerSection').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'flex';
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Ingresa correo y contraseña");
    auth.signInWithEmailAndPassword(email, password).catch(err => alert("Error: " + err.message));
});

// ====================== REGISTER FORM - VERSIÓN FINAL ======================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!email) return alert("❌ Ingresa un correo electrónico");
    if (password.length < 6) return alert("❌ La contraseña debe tener mínimo 6 caracteres");

    const clave = prompt("🔑 Ingresa clave de administrador:");

    if (clave !== "Adm123") {
        return alert("❌ Clave de administrador incorrecta");
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.ref('users/' + user.uid).set({
            email: user.email,
            role: "user",
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        });

        alert(`✅ Cuenta creada exitosamente:\n${email}`);
        document.getElementById('registerForm').reset();
       

    } catch (error) {
        console.error(error);
        alert("Error al crear cuenta: " + error.message);
    }
});


function logout() {
    if (confirm("¿Cerrar sesión?")) {
        auth.signOut().then(() => location.reload());
    }
}



// ====================== RECUPERAR CONTRASEÑA - CON ESTADO DE CARGA ======================
function forgotPassword() {
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';
    const link = event.currentTarget || event.target;  // El enlace clickeado

    if (!email) {
        alert("❌ Por favor ingresa tu correo electrónico en el campo.");
        if (emailInput) emailInput.focus();
        return;
    }

    const originalText = link.textContent;

    // Cambiar texto a "Enviando..."
    link.textContent = "Enviando...";
    link.style.pointerEvents = "none";   // Desactivar clicks mientras envía
    link.style.opacity = "0.7";

    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert(`✅ Se ha enviado un enlace de recuperación a:\n\n${email}\n\nRevisa tu bandeja de entrada y SPAM.`);
        })
        .catch((error) => {
            console.error(error);
            if (error.code === 'auth/user-not-found') {
                alert("No existe una cuenta con ese correo electrónico.");
            } else if (error.code === 'auth/invalid-email') {
                alert("El correo electrónico no es válido.");
            } else {
                alert("Error: " + error.message);
            }
        })
        .finally(() => {
            // Restaurar el texto original
            link.textContent = originalText;
            link.style.pointerEvents = "auto";
            link.style.opacity = "1";
        });
}









//SEGMENTO 3 (Guardado del Paciente + Auto-cálculos)

// ====================== GUARDAR / ACTUALIZAR PACIENTE CON HISTORIAL ======================
// ====================== GUARDAR / ACTUALIZAR CON HISTORIAL DETALLADO ======================
// ====================== GUARDAR / ACTUALIZAR CON HISTORIAL INTELIGENTE ======================
document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientData = {
        id: document.getElementById('patientId').value || Date.now().toString().slice(-6),
        estatusTabla: document.getElementById('estatusTabla').value,
        fechaIndQx: document.getElementById('fechaIndQx').value,
        nombreApellido: document.getElementById('nombreApellido').value.toUpperCase().trim(),
        rut: formatRut(document.getElementById('rut').value),
        fechaNac: document.getElementById('fechaNac').value,
        edad: parseInt(document.getElementById('edad').value) || 0,
        patologiasCronicas: document.getElementById('patologiasCronicas').value,
        medicamentosCronicos: document.getElementById('medicamentosCronicos').value,
        comuna: document.getElementById('comuna').value,
        direccion: document.getElementById('direccion').value,
        nContacto: document.getElementById('nContacto').value,
        emailPaciente: document.getElementById('emailPaciente').value,
        especialidad: document.getElementById('especialidad').value,
        medicoTratante: document.getElementById('medicoTratante').value,
        diagnostico: document.getElementById('diagnostico').value,
        lateralidad: document.getElementById('lateralidad').value,
        intervencion: document.getElementById('intervencion').value,
        estatusEpa: document.getElementById('estatusEpa').value,
        anestesiologo: document.getElementById('anestesiologo').value,
        fechaEpa: document.getElementById('fechaEpa').value,
        ges: document.getElementById('ges').value,
        taco: document.getElementById('taco').value,
        asa: document.getElementById('asa').value,
        ekg: document.getElementById('ekg').value,
        rx: document.getElementById('rx').value,
        eco: document.getElementById('eco').value,
        prioridad: document.getElementById('prioridad').value,
        observaciones: document.getElementById('observaciones').value,
        indicacionesAnest: document.getElementById('indicacionesAnest').value,
        folio: document.getElementById('folio').value,
        fechaEstatusProgram: document.getElementById('fechaEstatusProgram').value,
        fechaCirugia: document.getElementById('fechaCirugia').value,
        registro: currentUser ? currentUser.email : 'Sistema',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        if (currentPatientKey) {
            const oldData = currentModalPatient || {};

            let cambios = [];
            let descripcion = "Actualización general";

            Object.keys(patientData).forEach(key => {
                if (['timestamp', 'registro'].includes(key)) return;

                const oldVal = (oldData[key] || '').toString().trim();
                const newVal = (patientData[key] || '').toString().trim();

                if (oldVal !== newVal) {
                    if (key === 'observaciones' || key === 'indicacionesAnest') {
                        // Para estos campos mostramos solo lo nuevo agregado
                        const agregado = newVal.replace(oldVal, '').trim();
                        if (agregado) {
                            cambios.push(`<strong>${key}</strong>: Se agregó: "${agregado}"`);
                        } else {
                            cambios.push(`<strong>${key}</strong>: Texto modificado`);
                        }
                    } else {
                        cambios.push(`<strong>${key}</strong>: "${oldVal || 'vacío'}" → "${newVal || 'vacío'}"`);
                    }
                }
            });

            if (cambios.length > 0) {
                descripcion = `${cambios.length} campo(s) modificado(s)`;
            }

            await db.ref('patients/' + currentPatientKey).update(patientData);

            // Guardar historial
            await db.ref('patients/' + currentPatientKey + '/historial').push({
                fecha: new Date().toISOString(),
                usuario: currentUser ? currentUser.email : 'Sistema',
                accion: "Actualización",
                descripcion: descripcion,
                cambios: cambios.length > 0 ? cambios : null
            });

            alert("✅ Paciente actualizado correctamente");
        } else {
            // Nuevo registro
            const newRef = await db.ref('patients').push(patientData);
            currentPatientKey = newRef.key;

            await db.ref('patients/' + currentPatientKey + '/historial').push({
                fecha: new Date().toISOString(),
                usuario: currentUser ? currentUser.email : 'Sistema',
                accion: "Creación",
                descripcion: "Paciente registrado por primera vez"
            });

            alert("✅ Paciente guardado correctamente");
        }

        resetForm();
        showSection('patientList');
        currentPatientKey = null;

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
});


// Auto cálculos
document.getElementById('fechaNac').addEventListener('change', () => {
    document.getElementById('edad').value = calculateAge(document.getElementById('fechaNac').value);
});

document.getElementById('fechaIndQx').addEventListener('change', () => {
    document.getElementById('tEspera').value = calculateWaitingDays(document.getElementById('fechaIndQx').value);
});

document.getElementById('fechaEstatusProgram').addEventListener('change', () => {
    document.getElementById('esperaProgram').value = calculateWaitingDays(document.getElementById('fechaEstatusProgram').value);
});


//SEGMENTO 4 (Carga de Tabla + Dashboard + Modal)

// ====================== CARGA DE PACIENTES Y TABLA ======================
function loadPatients() {
    db.ref('patients').on('value', (snapshot) => {
        patients = [];
        snapshot.forEach((child) => {
            patients.push({
                firebaseKey: child.key,
                ...child.val()
            });
        });

        renderPatientsTable(patients);
        updateDashboard();
        
        setTimeout(makeTableSortable, 300);   // ← Importante
    });
}

// ====================== VARIABLES GLOBALES DE ORDENAMIENTO ======================
let currentSortColumn = null;
let currentSortOrder = 'asc';
// Variables para mantener filtros al editar
let lastFilters = {
    busquedaGeneral: '',
    filterEspecialidad: '',
    filterMedico: '',
    filterEstatus: '',
    filterFechaDesde: '',
    filterFechaHasta: '',
    soloSinFolio: false,
    mostrarDuplicados: false
};

// ====================== TABLA CON ORDENAMIENTO POR CLIC ======================
// ====================== TABLA CON ORDENAMIENTO CORREGIDO ======================


// ====================== TABLA CON ORDENAMIENTO POR DEFECTO (T. Espera ASCENDENTE) ======================
function renderPatientsTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Si estamos mostrando duplicados, NO aplicar el ordenamiento por T. Espera
    if (!mostrarDuplicados && !currentSortColumn) {
        currentSortColumn = 'tEspera';
        currentSortOrder = 'asc';
    }

    // Ordenamiento normal (solo si NO estamos en modo duplicados)
    if (!mostrarDuplicados) {
        data.sort((a, b) => {
            let valA, valB;

            switch(currentSortColumn) {
                case 'tEspera':
                    valA = calculateWaitingDays(a.fechaIndQx);
                    valB = calculateWaitingDays(b.fechaIndQx);
                    break;
                case 'esperaProgram':
                    valA = calculateWaitingDays(a.fechaEstatusProgram);
                    valB = calculateWaitingDays(b.fechaEstatusProgram);
                    break;
                case 'edad':
                    valA = Number(a.edad) || 0;
                    valB = Number(b.edad) || 0;
                    break;
                case 'fechaIndQx':
                    valA = new Date(a.fechaIndQx || 0);
                    valB = new Date(b.fechaIndQx || 0);
                    break;
                default:
                    valA = (a[currentSortColumn] || '').toString().toLowerCase();
                    valB = (b[currentSortColumn] || '').toString().toLowerCase();
            }

            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    data.forEach((patient) => {
        const fechaFormateada = patient.fechaIndQx ? formatDate(patient.fechaIndQx) : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${patient.id || '-'}</strong></td>
            <td>${patient.estatusTabla || '-'}</td>
            <td>${fechaFormateada}</td>
            <td><strong>${calculateWaitingDays(patient.fechaIndQx)}</strong></td>
            <td>${patient.fechaEstatusProgram ? calculateWaitingDays(patient.fechaEstatusProgram) : '-'}</td>
            <td>${patient.nombreApellido || ''}</td>
            <td>${patient.rut || ''}</td>
            <td>${patient.edad || ''}</td>
            <td>${patient.especialidad || ''}</td>
            <td>
                <button onclick="showPatientModal('${patient.firebaseKey}')" style="padding:6px 12px;">Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ====================== FUNCIÓN PARA FORMATEAR FECHA DD/MM/AAAA ======================
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Si es inválida, devuelve original

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}




// ====================== HACER ENCABEZADOS CLICABLES ======================
function makeTableSortable() {
    const headers = document.querySelectorAll('#patientsTable th');
    const columnKeys = ['id', 'estatusTabla', 'tEspera', 'esperaProgram', 'nombreApellido', 'rut', 'edad', 'especialidad'];

    headers.forEach((th, index) => {
        const column = columnKeys[index];
        if (!column) return;

        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            if (currentSortColumn === column) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortOrder = 'asc';
            }

            // Actualizar flechas
            headers.forEach(h => h.textContent = h.textContent.replace(/ [↑↓]$/, ''));
            th.textContent = th.textContent.replace(/ [↑↓]$/, '') + 
                           (currentSortOrder === 'asc' ? ' ↑' : ' ↓');

            filterPatients();
        });
    });
}

// ====================== ACTUALIZAR DASHBOARD COMPLETO ======================
let especialidadChartInstance = null;
let estatusChartInstance = null;

// ====================== ACTUALIZAR DASHBOARD - TOTAL GESTIONABLES ======================
// ====================== ACTUALIZAR DASHBOARD - TOTAL GESTIONABLES ======================
function updateDashboard() {
    const totalGeneral = patients.length;
    
    // Lista de estatus NO gestionables (más robusta)
    const noGestionables = [
        "EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO",
        "egreso", "rechazo", "traslado interno", "operado"
    ];

    const totalGestionables = patients.filter(p => {
        if (!p.estatusTabla) return true; // Si no tiene estatus, se considera gestionable
        const estatus = p.estatusTabla.toString().trim().toUpperCase();
        return !noGestionables.includes(estatus);
    }).length;

    // Actualizar número y título
    document.getElementById('totalPatients').textContent = totalGestionables;

    const totalCard = document.querySelector('.total-card h3');
    if (totalCard) {
        totalCard.textContent = "Total Pacientes Gestionables";
    }

    // Resto del dashboard (gráficos y tabla cruzada)
    const porEspecialidad = {};
    const porEstatus = {};
    const crossData = {};

    patients.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        const est = p.estatusTabla || 'Sin Estatus';

        porEspecialidad[esp] = (porEspecialidad[esp] || 0) + 1;
        porEstatus[est] = (porEstatus[est] || 0) + 1;

        if (!crossData[esp]) crossData[esp] = {};
        crossData[esp][est] = (crossData[esp][est] || 0) + 1;
    });

    renderEspecialidadChart(porEspecialidad);
    renderEstatusChart(porEstatus);
    renderCrossTable(crossData, porEspecialidad, porEstatus);
}

// ====================== GRÁFICO POR ESPECIALIDAD ======================
function renderEspecialidadChart(data) {
    const ctx = document.getElementById('especialidadChart');
    if (especialidadChartInstance) especialidadChartInstance.destroy();

    especialidadChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Cantidad de Pacientes',
                data: Object.values(data),
                backgroundColor: '#3b82f6',
                borderColor: '#1e40af',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

// ====================== GRÁFICO POR ESTATUS (PIE MEJORADO) ======================
// ====================== GRÁFICO POR ESTATUS (BARRAS) ======================
function renderEstatusChart(data) {
    const ctx = document.getElementById('estatusChart');
    if (estatusChartInstance) estatusChartInstance.destroy();

    estatusChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Cantidad de Pacientes',
                data: Object.values(data),
                backgroundColor: [
                    '#3b82f6',   // Azul - Programable
                    '#eab308',   // Amarillo - Pendiente EPA
                    '#10b981',   // Verde
                    '#ef4444',   // Rojo
                    '#8b5cf6',   // Morado
                    '#f97316',   // Naranja
                    '#14b8a6'    // Turquesa
                ],
                borderColor: '#1e40af',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

// ====================== TABLA CRUZADA ======================
function renderCrossTable(crossData, porEspecialidad, porEstatus) {
    const thead = document.getElementById('crossTableHead');
    const tbody = document.getElementById('crossTableBody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Encabezados
    let headerHTML = '<tr><th>Especialidad</th>';
    Object.keys(porEstatus).forEach(est => {
        headerHTML += `<th>${est}</th>`;
    });
    headerHTML += '<th><strong>Total</strong></th></tr>';
    thead.innerHTML = headerHTML;

    // Filas
    Object.keys(porEspecialidad).sort().forEach(esp => {
        let rowHTML = `<tr><td><strong>${esp}</strong></td>`;
        
        let totalEsp = 0;
        Object.keys(porEstatus).forEach(est => {
            const cantidad = crossData[esp] && crossData[esp][est] ? crossData[esp][est] : 0;
            rowHTML += `<td>${cantidad}</td>`;
            totalEsp += cantidad;
        });
        
        rowHTML += `<td><strong>${totalEsp}</strong></td></tr>`;
        tbody.innerHTML += rowHTML;
    });

    // Fila de Totales
    let totalRow = `<tr><td><strong>TOTAL</strong></td>`;
    let granTotal = 0;
    Object.keys(porEstatus).forEach(est => {
        const totalEstatus = porEstatus[est] || 0;
        totalRow += `<td><strong>${totalEstatus}</strong></td>`;
        granTotal += totalEstatus;
    });
    totalRow += `<td><strong>${granTotal}</strong></td></tr>`;
    tbody.innerHTML += totalRow;
}

//SEGMENTO 5 (Modal, Edición, Reportes y Navegación)

// ====================== MODAL Y ACCIONES ======================
// ====================== MODAL DETALLE COMPLETO CON TODOS LOS CAMPOS ======================
function showPatientModal(key) {
    currentModalPatient = patients.find(p => p.firebaseKey === key);
    if (!currentModalPatient) return;

    // Formateo de fechas
    const fechaIndQxFmt     = formatDate(currentModalPatient.fechaIndQx);
    const fechaNacFmt       = formatDate(currentModalPatient.fechaNac);
    const fechaEpaFmt       = formatDate(currentModalPatient.fechaEpa);
    const fechaEstatusProgFmt = formatDate(currentModalPatient.fechaEstatusProgram);
    const fechaCirugiaFmt   = formatDate(currentModalPatient.fechaCirugia);

    // Historial
    let historialHTML = '';
    if (currentModalPatient.historial) {
        const historialArray = Object.values(currentModalPatient.historial)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        historialHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📜 Historial de Modificaciones</h3>`;

        historialArray.forEach(h => {
            const fecha = new Date(h.fecha);
            let cambiosHTML = h.cambios ? `<ul style="margin:10px 0 0 22px;">${h.cambios.map(c => `<li>${c}</li>`).join('')}</ul>` : '';
            
            historialHTML += `
                <div style="margin-bottom:20px; padding:16px; background:#f8fafc; border-radius:10px; border-left:6px solid #3b82f6;">
                    <strong>${h.accion}</strong> — ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}
                    <br><small style="color:#64748b;">Usuario: ${h.usuario}</small>
                    ${cambiosHTML}
                </div>`;
        });
    }

    let html = `
        <h2 style="margin:0 0 30px 0; color:#1e40af; text-align:center; font-size:1.7rem;">
            📋 Detalle Completo del Paciente
        </h2>

        <!-- 1. DATOS ADMINISTRATIVOS -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            📋 1. Datos Administrativos
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>ID:</strong> ${currentModalPatient.id || '-'}</p>
            <p><strong>Estatus Tabla:</strong> <span style="color:#1e40af; font-weight:600;">${currentModalPatient.estatusTabla || '-'}</span></p>
            <p><strong>Folio:</strong> ${currentModalPatient.folio || '-'}</p>
            <p><strong>Fecha Indicación Qx:</strong> ${fechaIndQxFmt}</p>
            <p><strong>Tiempo de Espera:</strong> <strong style="color:#ef4444;">${calculateWaitingDays(currentModalPatient.fechaIndQx)} días</strong></p>
        </div>

        <!-- 2. DATOS DEL PACIENTE -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            👤 2. Datos del Paciente
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Nombre y Apellido:</strong> ${currentModalPatient.nombreApellido || '-'}</p>
            <p><strong>RUT:</strong> ${currentModalPatient.rut || '-'}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${fechaNacFmt}</p>
            <p><strong>Edad:</strong> <strong>${currentModalPatient.edad || '-'} años</strong></p>
            <p><strong>Comuna:</strong> ${currentModalPatient.comuna || '-'}</p>
            <p><strong>Dirección:</strong> ${currentModalPatient.direccion || '-'}</p>
            <p><strong>N° Contacto:</strong> ${currentModalPatient.nContacto || '-'}</p>
            <p><strong>Email:</strong> ${currentModalPatient.emailPaciente || '-'}</p>
        </div>

        <hr style="margin:35px 0; border:2px solid #e2e8f0;">

        <!-- 3. DATOS CLÍNICOS -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            🩺 3. Datos Clínicos
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Especialidad:</strong> ${currentModalPatient.especialidad || '-'}</p>
            <p><strong>Médico Tratante:</strong> ${currentModalPatient.medicoTratante || '-'}</p>
            <p><strong>Diagnóstico (CIE-10):</strong> ${currentModalPatient.diagnostico || '-'}</p>
            <p><strong>Intervención:</strong> ${currentModalPatient.intervencion || '-'}</p>
            <p><strong>Lateralidad:</strong> ${currentModalPatient.lateralidad || 'NO APLICA'}</p>
        </div>

        <hr style="margin:35px 0; border:2px solid #e2e8f0;">

        <!-- 4. EVALUACIÓN PREOPERATORIA -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            🔬 4. Evaluación Preoperatoria
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px 35px; margin-bottom:35px;">
            <p><strong>Estatus EPA:</strong> ${currentModalPatient.estatusEpa || '-'}</p>
            <p><strong>Fecha EPA:</strong> ${fechaEpaFmt}</p>
            <p><strong>Anestesiólogo:</strong> ${currentModalPatient.anestesiologo || '-'}</p>
            <p><strong>GES:</strong> ${currentModalPatient.ges || '-'}</p>
            <p><strong>TACO:</strong> ${currentModalPatient.taco || '-'}</p>
            <p><strong>ASA:</strong> ${currentModalPatient.asa || '-'}</p>
            <p><strong>EKG:</strong> ${currentModalPatient.ekg || '-'}</p>
            <p><strong>RX:</strong> ${currentModalPatient.rx || '-'}</p>
            <p><strong>ECO:</strong> ${currentModalPatient.eco || '-'}</p>
            <p><strong>Prioridad:</strong> ${currentModalPatient.prioridad || '-'}</p>
        </div>

        <hr style="margin:35px 0; border:2px solid #e2e8f0;">

        <!-- 5. PROGRAMACIÓN -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            📅 5. Programación Quirúrgica
        </h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Fecha Estatus Program:</strong> ${fechaEstatusProgFmt}</p>
            <p><strong>Fecha de Cirugía:</strong> ${fechaCirugiaFmt}</p>
            <p><strong>Espera Programación:</strong> <strong>${calculateWaitingDays(currentModalPatient.fechaEstatusProgram)} días</strong></p>
        </div>

        <hr style="margin:35px 0; border:2px solid #e2e8f0;">

        <!-- 6. OBSERVACIONES -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            📝 6. Observaciones
        </h3>
        <p><strong>Patologías Crónicas:</strong> ${currentModalPatient.patologiasCronicas || 'Ninguna'}</p>
        <p><strong>Medicamentos Crónicos:</strong> ${currentModalPatient.medicamentosCronicos || 'Ninguno'}</p>
        <p style="margin-top:18px;"><strong>Observaciones Generales:</strong><br>${currentModalPatient.observaciones || 'Sin observaciones'}</p>
        <p><strong>Indicaciones Anestesiólogo:</strong><br>${currentModalPatient.indicacionesAnest || 'Sin indicaciones'}</p>

        ${historialHTML}
    `;

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('patientModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('patientModal').style.display = 'none';
}

// ====================== EDITAR PACIENTE (CARGAR TODOS LOS CAMPOS) ======================
function editCurrentPatient() {
    if (!currentModalPatient) return;

    currentPatientKey = currentModalPatient.firebaseKey;
    closeModal();
    showSection('newPatient');

    // Llenar TODOS los campos del formulario
    const campos = {
        patientId: currentModalPatient.id,
        estatusTabla: currentModalPatient.estatusTabla,
        fechaIndQx: currentModalPatient.fechaIndQx,
        nombreApellido: currentModalPatient.nombreApellido,
        rut: currentModalPatient.rut,
        fechaNac: currentModalPatient.fechaNac,
        patologiasCronicas: currentModalPatient.patologiasCronicas,
        medicamentosCronicos: currentModalPatient.medicamentosCronicos,
        comuna: currentModalPatient.comuna,
        direccion: currentModalPatient.direccion,
        nContacto: currentModalPatient.nContacto,
        emailPaciente: currentModalPatient.emailPaciente,
        especialidad: currentModalPatient.especialidad,
        medicoTratante: currentModalPatient.medicoTratante,
        diagnostico: currentModalPatient.diagnostico,
        lateralidad: currentModalPatient.lateralidad,
        intervencion: currentModalPatient.intervencion,
        estatusEpa: currentModalPatient.estatusEpa,
        anestesiologo: currentModalPatient.anestesiologo,
        fechaEpa: currentModalPatient.fechaEpa,
        ges: currentModalPatient.ges,
        taco: currentModalPatient.taco,
        asa: currentModalPatient.asa,
        ekg: currentModalPatient.ekg,
        rx: currentModalPatient.rx,
        eco: currentModalPatient.eco,
        prioridad: currentModalPatient.prioridad,
        observaciones: currentModalPatient.observaciones,
        indicacionesAnest: currentModalPatient.indicacionesAnest,
        folio: currentModalPatient.folio,
        fechaEstatusProgram: currentModalPatient.fechaEstatusProgram,
        fechaCirugia: currentModalPatient.fechaCirugia
    };

    // Llenar cada campo
    Object.keys(campos).forEach(key => {
        const elemento = document.getElementById(key);
        if (elemento) {
            elemento.value = campos[key] || '';
        }
    });

    // Actualizar médico tratante según especialidad
    if (currentModalPatient.especialidad) {
        filterMedicos();
        setTimeout(() => {
            const medicoSelect = document.getElementById('medicoTratante');
            if (medicoSelect) medicoSelect.value = currentModalPatient.medicoTratante || '';
        }, 100);
    }

    // Calcular campos automáticos
    if (currentModalPatient.fechaNac) {
        document.getElementById('edad').value = calculateAge(currentModalPatient.fechaNac);
    }
    if (currentModalPatient.fechaIndQx) {
        document.getElementById('tEspera').value = calculateWaitingDays(currentModalPatient.fechaIndQx);
    }
    if (currentModalPatient.fechaEstatusProgram) {
        document.getElementById('esperaProgram').value = calculateWaitingDays(currentModalPatient.fechaEstatusProgram);
    }
}

function deleteCurrentPatient() {
    if (!currentModalPatient || !confirm("¿Eliminar este paciente?")) return;
    db.ref('patients/' + currentModalPatient.firebaseKey).remove()
        .then(() => { closeModal(); alert("Paciente eliminado"); });
}

// ====================== NAVEGACIÓN ======================
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(section + 'Section').style.display = 'block';

    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    const active = Array.from(document.querySelectorAll('.sidebar li')).find(li => li.getAttribute('onclick').includes(section));
    if (active) active.classList.add('active');

    // === LÓGICA SEGÚN SECCIÓN ===
    if (section === 'patientList') {
        setTimeout(restaurarFiltros, 100);
    }
    else if (section === 'users') {
        setTimeout(loadUsers, 150);     // ← Importante: Cargar usuarios automáticamente
    }
}

function resetForm() {
    document.getElementById('patientForm').reset();
    currentPatientKey = null;
}

// ====================== AUTENTICACIÓN ======================
// ====================== AUTENTICACIÓN CON BLOQUEO DE USUARIOS DESACTIVADOS ======================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Verificar si el usuario está desactivado
        const userDataSnap = await db.ref('users/' + user.uid).once('value');
        const userData = userDataSnap.val();

        if (userData && userData.role === "disabled") {
            alert("❌ Tu cuenta ha sido desactivada por un administrador.");
            auth.signOut();
            return;
        }

        currentUser = user;
        currentUserRole = userData?.role || 'user';
        checkAdminAccess();

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email;

        loadPatients();
        showSection('dashboard');
    } else {
        currentUser = null;
        currentUserRole = null;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'none';
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return alert("Por favor ingresa correo y contraseña");
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            console.log("✅ Login exitoso");
        })
        .catch(error => {
            console.error(error);
            alert("Error al iniciar sesión: " + error.message);
        });
});


// ====================== CARGAR TODOS LOS DESPLEGABLES ======================
function cargarDesplegables() {
    // 1. Estatus Tabla
    const estatusSelect = document.getElementById('estatusTabla');
    if (estatusSelect) {
        const opcionesEstatus = ['PROGRAMABLE','PENDIENTE EPA','NO PROGRAMABLE','ACTUALIZAR','CARTA CERTIFICADA','OPERADO','EGRESO','TRASLADO INTERNO','RECHAZO','EXCEPTUADO TRANSITORIO','EXCEPTUADO POR RECHAZO', 'EXCEPTUADO INUBICABLE'];
        estatusSelect.innerHTML = '<option value="">Seleccionar Estatus</option>';
        opcionesEstatus.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            estatusSelect.appendChild(option);
        });
    }

    // 2. Estatus EPA
    const estatusEpaSelect = document.getElementById('estatusEpa');
    if (estatusEpaSelect) {
        estatusEpaSelect.innerHTML = `
            <option value="">Seleccionar</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="AGENDADO">AGENDADO</option>
            <option value="REALIZADO">REALIZADO</option>
            <option value="NO APLICA">NO APLICA</option>
        `;
    }

    // 3. Anestesiólogo
    const anestesiologoSelect = document.getElementById('anestesiologo');
    if (anestesiologoSelect) {
        anestesiologoSelect.innerHTML = `
            <option value="">Seleccionar Anestesiólogo</option>
            <option value="DR. DANILO NAVA">DR. DANILO NAVA</option>
            <option value="DR. PEDRO GOLES">DR. PEDRO GOLES</option>
            <option value="DRA. MARIANGEL YANES">DRA. MARIANGEL YANES</option>
            <option value="DRA. RAQUEL VALERO">DRA. RAQUEL VALERO</option>
            <option value="DRA. MARINELA RICCOBONO">DRA. MARINELA RICCOBONO</option>
            <option value="DR. ROBERTO OROZCO">DR. ROBERTO OROZCO</option>
            <option value="DR. DANIEL RIQUELME">DR. DANIEL RIQUELME</option>
            <option value="DR. ANGEL MONTIEL">DR. ANGEL MONTIEL</option>
        `;
    }

    // 4. GES, TACO, ASA, EKG, RX, ECO (SI / NO / NO APLICA)
    const camposSiNo = ['ges', 'taco', 'asa', 'ekg', 'rx', 'eco'];
    camposSiNo.forEach(campo => {
        const select = document.getElementById(campo);
        if (select) {
            select.innerHTML = `
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
                <option value="NO APLICA">NO APLICA</option>
            `;
        }
    });

    // 5. Comuna
    const comunaSelect = document.getElementById('comuna');
    if (comunaSelect) {
        const comunas = ['ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA'];
        comunaSelect.innerHTML = '<option value="">Seleccionar Comuna</option>';
        comunas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            comunaSelect.appendChild(opt);
        });
    }

    // 6. Especialidad
    const especialidadSelect = document.getElementById('especialidad');
    if (especialidadSelect) {
        const especialidades = Object.keys(especialistas);
        especialidadSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>';
        especialidades.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            especialidadSelect.appendChild(opt);
        });
    }

    // 7. Lateralidad y Prioridad
    const lateralidadSelect = document.getElementById('lateralidad');
    if (lateralidadSelect) {
        lateralidadSelect.innerHTML = `
            <option value="NO APLICA">NO APLICA</option>
            <option value="DERECHA">DERECHA</option>
            <option value="IZQUIERDA">IZQUIERDA</option>
        `;
    }

    const prioridadSelect = document.getElementById('prioridad');
    if (prioridadSelect) {
        prioridadSelect.innerHTML = `
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
        `;
    }
}

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarDesplegables();
    cargarFiltrosLista();
});




// ====================== CARGAR FILTROS ======================
function cargarFiltrosLista() {
    // Especialidad
    const filterEsp = document.getElementById('filterEspecialidad');
    if (filterEsp) {
        filterEsp.innerHTML = '<option value="">Todas las Especialidades</option>';
        Object.keys(especialistas).forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            filterEsp.appendChild(opt);
        });
    }

    // Estatus Tabla
    const filterEstatus = document.getElementById('filterEstatus');
    if (filterEstatus) {
        const opciones = ['PROGRAMABLE','PENDIENTE EPA','NO PROGRAMABLE','ACTUALIZAR','CARTA CERTIFICADA','OPERADO','EGRESO','TRASLADO INTERNO','RECHAZO','EXCEPTUADO NO GESTIONABLE','EXCEPTUADO GESTIONABLE'];
        filterEstatus.innerHTML = '<option value="">Todos los Estatus</option>';
        opciones.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            filterEstatus.appendChild(option);
        });
    }
}

// Actualizar Médicos según Especialidad
document.getElementById('filterEspecialidad').addEventListener('change', function() {
    const medicoFilter = document.getElementById('filterMedico');
    const especialidad = this.value;
    
    medicoFilter.innerHTML = '<option value="">Todos los Médicos</option>';
    
    if (especialidad && especialistas[especialidad]) {
        especialistas[especialidad].forEach(med => {
            const opt = document.createElement('option');
            opt.value = med;
            opt.textContent = med;
            medicoFilter.appendChild(opt);
        });
    }
});

// ====================== FILTRADO PRINCIPAL ======================

//aquiii
// ====================== VARIABLES GLOBALES DE FILTROS ======================
let soloSinFolio = false;
let mostrarDuplicados = false;

// ====================== FILTRADO PRINCIPAL ======================
// ====================== FILTRADO PRINCIPAL ======================
function filterPatients() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad').value;
    const medico = document.getElementById('filterMedico').value;
    const estatus = document.getElementById('filterEstatus').value;
    const fechaDesde = document.getElementById('filterFechaDesde').value;
    const fechaHasta = document.getElementById('filterFechaHasta').value;

    let filtered = patients.filter(p => {
        let pasa = true;

        if (busqueda) {
            const texto = `
                ${p.nombreApellido || ''} 
                ${p.rut || ''} 
                ${p.diagnostico || ''} 
                ${p.intervencion || ''} 
                ${p.especialidad || ''} 
                ${p.medicoTratante || ''}
            `.toLowerCase();
            if (!texto.includes(busqueda)) pasa = false;
        }

        if (especialidad && p.especialidad !== especialidad) pasa = false;
        if (medico && p.medicoTratante !== medico) pasa = false;
        if (estatus && p.estatusTabla !== estatus) pasa = false;

        if (fechaDesde || fechaHasta) {
            const fechaInd = new Date(p.fechaIndQx || 0);
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
        }

        if (soloSinFolio) {
            const folio = (p.folio || '').toString().trim();
            if (folio !== '') pasa = false;
        }

        return pasa;
    });

    // ==================== FILTRO DE DUPLICADOS ====================
    if (mostrarDuplicados) {
        const rutCount = {};
        filtered.forEach(p => {
            if (p.rut) rutCount[p.rut] = (rutCount[p.rut] || 0) + 1;
        });

        filtered = filtered.filter(p => p.rut && rutCount[p.rut] > 1);

        // Ordenamiento fuerte por RUT (agrupados)
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    renderPatientsTable(filtered);
    mostrarContadorResultados(filtered.length);

    guardarFiltrosActuales();
}

// ====================== MOSTRAR CONTADOR DE RESULTADOS ======================
// ====================== MOSTRAR CONTADOR DE RESULTADOS ======================
function mostrarContadorResultados(cantidad) {
    let contador = document.getElementById('resultadosContador');
    
    if (!contador) {
        contador = document.createElement('div');
        contador.id = 'resultadosContador';
        contador.style.cssText = `
            background: #eff6ff;
            color: #1e40af;
            padding: 14px 20px;
            border-radius: 8px;
            font-weight: 600;
            margin: 12px 0 18px 0;
            text-align: center;
            font-size: 1.08rem;
            border: 1px solid #bfdbfe;
        `;
        
        const filters = document.querySelector('.filters');
        if (filters && filters.parentNode) {
            filters.parentNode.insertBefore(contador, filters.nextSibling);
        }
    }

    if (cantidad === patients.length) {
        contador.innerHTML = `📋 <strong>${cantidad}</strong> pacientes en total`;
        contador.style.background = '#ecfdf5';
        contador.style.color = '#0f766e';
        contador.style.borderColor = '#a7f3d0';
    } 
    else if (cantidad === 0) {
        contador.innerHTML = `❌ No se encontraron registros`;
        contador.style.background = '#fee2e2';
        contador.style.color = '#b91c1c';
        contador.style.borderColor = '#fecaca';
    } 
    else {
        contador.innerHTML = `✅ <strong>${cantidad}</strong> registro${cantidad !== 1 ? 's' : ''} encontrado${cantidad !== 1 ? 's' : ''} (de ${patients.length} total)`;
        contador.style.background = '#eff6ff';
        contador.style.color = '#1e40af';
        contador.style.borderColor = '#bfdbfe';
    }
}
// ====================== BOTONES TOGGLE ======================
function toggleSinFolio() {
    soloSinFolio = !soloSinFolio;
    const btn = document.getElementById('btnSinFolio');
    if (btn) {
        if (soloSinFolio) {
            btn.style.background = '#eab308';
            btn.style.color = 'black';
            btn.textContent = '✅ Solo Sin Folio';
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = 'Sin Folio';
        }
    }
    filterPatients();
}

function toggleDuplicados() {
    mostrarDuplicados = !mostrarDuplicados;
    const btn = document.getElementById('btnDuplicados');
    
    if (btn) {
        if (mostrarDuplicados) {
            btn.style.background = '#eab308';
            btn.style.color = 'black';
            btn.textContent = '✅ Mostrando Duplicados (agrupados)';
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = 'Mostrar Duplicados (RUT)';
        }
    }
    filterPatients();
}

// ====================== LIMPIAR FILTROS ======================
function clearFilters() {
    soloSinFolio = false;
    mostrarDuplicados = false;

    document.getElementById('busquedaGeneral').value = '';
    document.getElementById('filterEspecialidad').value = '';
    document.getElementById('filterMedico').value = '';
    document.getElementById('filterEstatus').value = '';
    document.getElementById('filterFechaDesde').value = '';
    document.getElementById('filterFechaHasta').value = '';

    const btnSinFolio = document.getElementById('btnSinFolio');
    const btnDuplicados = document.getElementById('btnDuplicados');
    
    if (btnSinFolio) {
        btnSinFolio.style.background = '';
        btnSinFolio.style.color = '';
        btnSinFolio.textContent = 'Sin Folio';
    }
    if (btnDuplicados) {
        btnDuplicados.style.background = '';
        btnDuplicados.style.color = '';
        btnDuplicados.textContent = 'Mostrar Duplicados (RUT)';
    }

    renderPatientsTable(patients);
    mostrarContadorResultados(patients.length);
}

// Llamar carga de filtros cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    cargarDesplegables();   // del formulario
    cargarFiltrosLista();   // de la lista
});



///////// imprimir/////
// ====================== IMPRIMIR INFORME COMPLETO CON HISTORIAL ======================
// ====================== IMPRIMIR INFORME COMPLETO CON HISTORIAL DETALLADO ======================
// ====================== IMPRIMIR INFORME COMPLETO CON FECHAS FORMATEADAS ======================
function printPatient() {
    if (!currentModalPatient) return;

    const p = currentModalPatient;

    // Formatear fechas
    const fechaIndQxFmt = p.fechaIndQx ? formatDate(p.fechaIndQx) : '-';
    const fechaNacFmt = p.fechaNac ? formatDate(p.fechaNac) : '-';
    const fechaEpaFmt = p.fechaEpa ? formatDate(p.fechaEpa) : '-';
    const fechaEstatusProgramFmt = p.fechaEstatusProgram ? formatDate(p.fechaEstatusProgram) : '-';
    const fechaCirugiaFmt = p.fechaCirugia ? formatDate(p.fechaCirugia) : 'No programada';

    // Preparar historial detallado
    let historialPrint = '';
    if (p.historial && Object.keys(p.historial).length > 0) {
        const historialArray = Object.values(p.historial)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        historialPrint = `<h2>📜 Historial de Modificaciones</h2>`;

        historialArray.forEach(h => {
            const fecha = new Date(h.fecha);
            let cambiosHTML = '';

            if (h.cambios && Array.isArray(h.cambios) && h.cambios.length > 0) {
                cambiosHTML = `<ul style="margin:8px 0; padding-left:20px;">${h.cambios.map(c => `<li>${c}</li>`).join('')}</ul>`;
            }

            historialPrint += `
                <div style="margin:12px 0; padding:12px; background:#f8fafc; border-left:4px solid #3b82f6; border-radius:6px;">
                    <strong>${h.accion}</strong> — ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}<br>
                    <strong>Usuario:</strong> ${h.usuario}<br>
                    ${cambiosHTML || `<em>${h.descripcion || 'Sin descripción'}</em>`}
                </div>`;
        });
    } else {
        historialPrint = `<p><em>No hay historial de modificaciones registrado aún.</em></p>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Ficha - ${p.nombreApellido}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; line-height: 1.35; color: #1e2937; }
                .header { margin-bottom: 25px; border-bottom: 3px solid #1e40af; padding-bottom: 15px;}
                .header-content { display: flex; align-items: center; gap: 20px; }
                .logo { height: 80px; width: auto; }
                .title-container { flex: 1; text-align: center; }
                h1 { font-size: 19px; margin: 0 0 5px 0; color: #1e40af; }
                h2 { font-size: 15px; margin: 18px 0 8px 0; color: #1e40af; border-bottom: 1px solid #cbd5e1; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 14px; margin: 8px 0; }
                .label { font-weight: bold; color: #475569; display: inline-block; width: 160px; }
                hr { margin: 16px 0; border: none; border-top: 1px solid #e2e8f0; }

                p {
                    margin: 0px 0 !important;     /* Fuerza eliminar margen de párrafos */
                    padding: 0px 0 !important;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-content">
                    <img src="logo.png" alt="Hospital Illapel" class="logo">
                    <div class="title-container">
                        <h1>FICHA DE REGISTRO DE PACIENTE</h1>
                        <h2>HOSPITAL DE ILLAPEL</h2>
                        <h3>UNIDAD DE PREQUIRÚRGICO</h3>
                    </div>
                </div>
            </div>

            <h2>📋 Datos Administrativos</h2>
            <div class="grid">
                <p><span class="label">ID:</span> ${p.id || '-'}</p>
                <p><span class="label">Estatus Tabla:</span> ${p.estatusTabla || '-'}</p>
                <p><span class="label">Folio:</span> ${p.folio || '-'}</p>
                <p><span class="label">Fecha Ind. Qx:</span> ${fechaIndQxFmt}</p>
            </div>

            <hr>

            <h2>⏱️ Tiempos de Espera</h2>
            <div class="grid">
                <p><span class="label">T. Espera Actual:</span> <strong>${calculateWaitingDays(p.fechaIndQx)} días</strong></p>
                <p><span class="label">Espera Programación:</span> <strong>${calculateWaitingDays(p.fechaEstatusProgram)} días</strong></p>
            </div>

            <hr>

            <h2>👤 Datos del Paciente</h2>
            <div class="grid">
                <p><span class="label">Nombre y Apellido:</span> ${p.nombreApellido || '-'}</p>
                <p><span class="label">RUT:</span> ${p.rut || '-'}</p>
                <p><span class="label">Edad:</span> ${p.edad || '-'} años</p>
                <p><span class="label">Fecha Nacimiento:</span> ${fechaNacFmt}</p>
                <p><span class="label">Comuna:</span> ${p.comuna || '-'}</p>
                <p><span class="label">Dirección:</span> ${p.direccion || '-'}</p>
                <p><span class="label">N° Contacto:</span> ${p.nContacto || '-'}</p>
                <p><span class="label">Email:</span> ${p.emailPaciente || '-'}</p>
            </div>

            <hr>

            <h2>🩺 Datos Clínicos</h2>
            <div class="grid">
                <p><span class="label">Especialidad:</span> ${p.especialidad || '-'}</p>
                <p><span class="label">Médico Tratante:</span> ${p.medicoTratante || '-'}</p>
                <p><span class="label">Diagnóstico:</span> ${p.diagnostico || '-'}</p>
                <p><span class="label">Lateralidad:</span> ${p.lateralidad || '-'}</p>
                <p><span class="label">Intervención:</span> ${p.intervencion || '-'}</p>
            </div>

            <hr>

            <h2>🔬 Evaluación Preoperatoria</h2>
            <div class="grid">
                <p><span class="label">Estatus EPA:</span> ${p.estatusEpa || '-'}</p>
                <p><span class="label">Anestesiólogo:</span> ${p.anestesiologo || '-'}</p>
                <p><span class="label">Fecha EPA:</span> ${fechaEpaFmt}</p>
                <p><span class="label">GES:</span> ${p.ges || '-'}</p>
                <p><span class="label">TACO:</span> ${p.taco || '-'}</p>
                <p><span class="label">ASA:</span> ${p.asa || '-'}</p>
                <p><span class="label">EKG:</span> ${p.ekg || '-'}</p>
                <p><span class="label">RX:</span> ${p.rx || '-'}</p>
                <p><span class="label">ECO:</span> ${p.eco || '-'}</p>
                <p><span class="label">Prioridad:</span> ${p.prioridad || '-'}</p>
            </div>

            <hr>

            <h2>📅 Programación</h2>
            <div class="grid">
                <p><span class="label">Fecha Estatus Program:</span> ${fechaEstatusProgramFmt}</p>
                <p><span class="label">Fecha de Cirugía:</span> ${fechaCirugiaFmt}</p>
            </div>

            <hr>

            <h2>📝 Observaciones</h2>
            <p><strong>Patologías Crónicas:</strong> ${p.patologiasCronicas || 'Ninguna'}</p>
            <p><strong>Medicamentos Crónicos:</strong> ${p.medicamentosCronicos || 'Ninguno'}</p>
            <p><strong>Observaciones:</strong> ${p.observaciones || 'Sin observaciones'}</p>
            <p><strong>Indicaciones Anestesiólogo:</strong> ${p.indicacionesAnest || 'Sin indicaciones'}</p>

            <hr>

            ${historialPrint}

            <div style="margin-top:35px; text-align:center; font-size:11px; color:#64748b;">
                Generado por Sistema Unidad Prequirúrgica • ${new Date().toLocaleDateString('es-CL')}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
}

// Función auxiliar para calcular días
function calcularDiasEspera(fechaStr) {
    if (!fechaStr) return '-';
    try {
        const fecha = new Date(fechaStr);
        const hoy = new Date();
        const diffTime = hoy - fecha;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    } catch (e) {
        return '-';
    }
}



//descargas

// ====================== DESCARGAR COMO CSV ======================
function downloadCSV() {
    const data = getCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar.");

    let csvContent = "ID;Estatus Tabla;T.Espera;Fecha Ind Qx;Nombre y Apellido;RUT;Edad;Comuna;Especialidad;Médico Tratante;Diagnóstico;Intervención;Fecha Cirugía;Observaciones\n";

    data.forEach(p => {
        const tEspera = calcularDiasEspera(p.fechaIndQx);
        csvContent += `"${p.id || ''}";"${p.estatusTabla || ''}";"${tEspera}";"${p.fechaIndQx || ''}";"${p.nombreApellido || ''}";"${p.rut || ''}";"${p.edad || ''}";"${p.comuna || ''}";"${p.especialidad || ''}";"${p.medicoTratante || ''}";"${p.diagnostico || ''}";"${p.intervencion || ''}";"${p.fechaCirugia || ''}";"${(p.observaciones || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Pacientes_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();

    alert(`✅ CSV descargado (${data.length} registros)`);
}

// ====================== DESCARGAR EXCEL COMPLETO (TODAS LAS COLUMNAS) ======================
function downloadExcel() {
    const data = getCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar.");

    // Mapeo completo de todas las columnas
    const excelData = data.map(p => ({
        "ID": p.id || '',
        "Estatus Tabla": p.estatusTabla || '',
        "T. Espera (días)": calcularDiasEspera(p.fechaIndQx),
        "Fecha Indicación Qx": p.fechaIndQx || '',
        "Nombre y Apellido": p.nombreApellido || '',
        "RUT": p.rut || '',
        "Fecha Nacimiento": p.fechaNac || '',
        "Edad": p.edad || '',
        "Patologías Crónicas": p.patologiasCronicas || '',
        "Medicamentos Crónicos": p.medicamentosCronicos || '',
        "Comuna": p.comuna || '',
        "Dirección": p.direccion || '',
        "N° Contacto": p.nContacto || '',
        "Email": p.emailPaciente || '',
        "Especialidad": p.especialidad || '',
        "Médico Tratante": p.medicoTratante || '',
        "Diagnóstico (CIE10)": p.diagnostico || '',
        "Lateralidad": p.lateralidad || '',
        "Intervención": p.intervencion || '',
        "Estatus EPA": p.estatusEpa || '',
        "Anestesiólogo": p.anestesiologo || '',
        "Fecha EPA": p.fechaEpa || '',
        "GES": p.ges || '',
        "TACO": p.taco || '',
        "ASA": p.asa || '',
        "EKG": p.ekg || '',
        "RX": p.rx || '',
        "ECO": p.eco || '',
        "Prioridad": p.prioridad || '',
        "Observaciones": p.observaciones || '',
        "Indicaciones Anestesiólogo": p.indicacionesAnest || '',
        "Folio": p.folio || '',
        "Fecha Estatus Program": p.fechaEstatusProgram || '',
        "T. Espera Programación": calcularDiasEspera(p.fechaEstatusProgram),
        "Fecha de Cirugía": p.fechaCirugia || '',
        "Registrado por": p.registro || ''
    }));

    // Crear Excel real
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");

    // Descargar
    XLSX.writeFile(wb, `Pacientes_Completo_${new Date().toISOString().slice(0,10)}.xlsx`);

    alert(`✅ Excel completo descargado correctamente (${data.length} registros)`);
}
// ====================== OBTENER DATOS FILTRADOS ======================
function getCurrentFilteredData() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad').value;
    const medico = document.getElementById('filterMedico').value;
    const estatus = document.getElementById('filterEstatus').value;
    const fechaDesde = document.getElementById('filterFechaDesde').value;
    const fechaHasta = document.getElementById('filterFechaHasta').value;

    return patients.filter(p => {
        let pasa = true;

        if (busqueda) {
            const texto = `${p.nombreApellido || ''} ${p.rut || ''} ${p.diagnostico || ''} ${p.intervencion || ''} ${p.especialidad || ''} ${p.medicoTratante || ''}`.toLowerCase();
            if (!texto.includes(busqueda)) pasa = false;
        }
        if (especialidad && p.especialidad !== especialidad) pasa = false;
        if (medico && p.medicoTratante !== medico) pasa = false;
        if (estatus && p.estatusTabla !== estatus) pasa = false;

        if (fechaDesde || fechaHasta) {
            const fechaInd = new Date(p.fechaIndQx || 0);
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
        }
        if (soloSinFolio) {
            const folio = (p.folio || '').toString().trim();
            if (folio !== '') pasa = false;
        }
        return pasa;
    });
}



// ====================== FORMATEAR TODOS LOS RUTs CON MODAL DE CARGA ======================
function formatearTodosLosRUT() {
    if (!confirm("⚠️ ¿Quieres formatear TODOS los RUTs existentes?\n\nEsta acción es segura.")) {
        return;
    }

    // Mostrar modal de carga
    document.getElementById('loadingModal').style.display = 'flex';

    let count = 0;
    let procesados = 0;

    db.ref('patients').once('value', (snapshot) => {
        const total = snapshot.numChildren();
        
        snapshot.forEach((child) => {
            const patient = child.val();
            procesados++;

            if (patient.rut) {
                const rutFormateado = formatRut(patient.rut);
                
                if (rutFormateado !== patient.rut) {
                    db.ref('patients/' + child.key).update({ rut: rutFormateado });
                    count++;
                }
            }
        });

        // Cerrar modal de carga
        document.getElementById('loadingModal').style.display = 'none';

        // Mostrar resultado
        alert(`✅ Proceso finalizado!\n\nRegistros procesados: ${procesados}\nRUTs formateados: ${count}`);
    });
}




// ====================== IMPRIMIR DASHBOARD PROFESIONAL (OPTIMIZADO) ======================
function printDashboard() {
    const totalGestionables = document.getElementById('totalPatients').textContent;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Dashboard - Unidad Prequirúrgico</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 15px;
                    font-size: 12px;
                    line-height: 1.3;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 4px solid #1e40af;
                    padding-bottom: 12px;
                }
                .logo { height: 70px; }
                h1 { font-size: 20px; margin: 5px 0; color: #1e40af; }
                h2 { font-size: 15px; margin: 3px 0; color: #334155; }
                h3 { font-size: 13px; margin: 2px 0; color: #64748b; }

                .total-big {
                    font-size: 38px;
                    font-weight: bold;
                    color: #1e40af;
                    text-align: center;
                    margin: 15px 0;
                }

                .charts-print {
                    display: flex;
                    gap: 15px;
                    margin: 20px 0;
                }
                .chart-print {
                    flex: 1;
                    border: 1px solid #e2e8f0;
                    padding: 8px;
                    border-radius: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 11.5px;
                }
                th, td {
                    border: 1px solid #94a3b8;
                    padding: 8px 6px;
                    text-align: center;
                }
                th {
                    background: #1e40af;
                    color: white;
                    font-size: 12px;
                }
                tr:nth-child(even) { background: #f8fafc; }

                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 11px;
                    color: #64748b;
                }
                @media print {
                    body { margin: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" alt="Hospital Illapel" class="logo">
                <h1>FICHA DASHBOARD - UNIDAD PREQUIRÚRGICO</h1>
                <h2>HOSPITAL DE ILLAPEL</h2>
                <h3>RESUMEN GENERAL DE PACIENTES</h3>
            </div>

            <h2>Total Pacientes Gestionables</h2>
            <p class="total-big">${totalGestionables} PACIENTES</p>

            <div class="charts-print">
                <div class="chart-print">
                    <h3>Pacientes por Especialidad</h3>
                    <img src="${document.getElementById('especialidadChart').toDataURL()}" style="width:100%; max-height:220px;">
                </div>
                <div class="chart-print">
                    <h3>Pacientes por Estatus Tabla</h3>
                    <img src="${document.getElementById('estatusChart').toDataURL()}" style="width:100%; max-height:220px;">
                </div>
            </div>

            <h3>📊 Pacientes por Especialidad vs Estatus</h3>
            ${document.getElementById('crossTable').outerHTML}

            <div class="footer">
                Generado por Sistema Unidad Prequirúrgica • ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
}






// ====================== ANÁLISIS CON IA ======================
// ====================== ANÁLISIS CON GEMINI (GRATIS) ======================
async function analizarConIA() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ Analizando con IA...";

    try {
        // Preparar datos de la tabla
        const porEspecialidad = {};
        const porEstatus = {};
        const crossData = {};

        patients.forEach(p => {
            const esp = p.especialidad || 'Sin Especialidad';
            const est = p.estatusTabla || 'Sin Estatus';
            porEspecialidad[esp] = (porEspecialidad[esp] || 0) + 1;
            porEstatus[est] = (porEstatus[est] || 0) + 1;

            if (!crossData[esp]) crossData[esp] = {};
            crossData[esp][est] = (crossData[esp][est] || 0) + 1;
        });

        let tablaMarkdown = "Especialidad | " + Object.keys(porEstatus).join(" | ") + " | Total\n";
        tablaMarkdown += "---".repeat(Object.keys(porEstatus).length + 2) + "\n";

        Object.keys(porEspecialidad).sort().forEach(esp => {
            let fila = `${esp} | `;
            let total = 0;
            Object.keys(porEstatus).forEach(est => {
                const cant = crossData[esp]?.[est] || 0;
                fila += `${cant} | `;
                total += cant;
            });
            fila += total;
            tablaMarkdown += fila + "\n";
        });

        const prompt = `Eres un analista experto en gestión hospitalaria. Analiza estos datos de la Unidad Prequirúrgico del Hospital de Illapel:

Total pacientes: ${patients.length}

Tabla Especialidad vs Estatus:
${tablaMarkdown}

Genera un informe claro y profesional con:
1. Resumen Ejecutivo
2. Análisis por Especialidad
3. Análisis por Estatus
4. Principales insights y riesgos
5. Recomendaciones concretas`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyC3oDS6A-YMC20BIXjaxDo8qUpdEgEI1ME', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Error en Gemini");
        }

        const analisis = data.candidates[0].content.parts[0].text;
        mostrarModalAnalisis(analisis);

    } catch (error) {
        console.error(error);
        alert("❌ Error con Gemini:\n" + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// =// ====================== MOSTRAR ANÁLISIS CON OPCIÓN DE IMPRESIÓN ======================
function mostrarModalAnalisis(texto) {
    let modal = document.getElementById('modalAnalisisIA');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalAnalisisIA';
        modal.className = 'modal';
        modal.style.cssText = `display:flex; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.75); align-items:center; justify-content:center;`;
        
        modal.innerHTML = `
            <div style="background:white; max-width:1000px; width:95%; max-height:92vh; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <!-- Header del Modal -->
                <div style="padding:15px 25px; background:#1e40af; color:white; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0; font-size:1.4rem;">🤖 Análisis Inteligente - Unidad Prequirúrgico</h2>
                    <div>
                        <button onclick="imprimirAnalisisIA()" style="margin-right:10px; padding:8px 16px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer;">
                            🖨️ Imprimir Análisis
                        </button>
                        <span onclick="cerrarModalAnalisis()" style="font-size:28px; cursor:pointer; font-weight:bold;">&times;</span>
                    </div>
                </div>
                
                <!-- Contenido -->
                <div id="contenidoAnalisis" style="padding:30px; line-height:1.7; font-size:15.2px; max-height:75vh; overflow-y:auto; color:#1f2937;"></div>
            </div>`;
        document.body.appendChild(modal);
    }

    // Convertir saltos de línea y mejorar formato
    let htmlContent = texto
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    htmlContent = `<p>${htmlContent}</p>`;
    
    document.getElementById('contenidoAnalisis').innerHTML = htmlContent;
    modal.style.display = 'flex';
}

// ====================== CERRAR MODAL ======================
function cerrarModalAnalisis() {
    const modal = document.getElementById('modalAnalisisIA');
    if (modal) modal.style.display = 'none';
}

// ====================== IMPRIMIR ANÁLISIS EN FORMATO PROFESIONAL ======================
function imprimirAnalisisIA() {
    const contenido = document.getElementById('contenidoAnalisis').innerText || document.getElementById('contenidoAnalisis').textContent;

    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Análisis Inteligente - Unidad Prequirúrgico</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 30px; 
                    line-height: 1.6; 
                    color: #1f2937;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px; 
                    border-bottom: 4px solid #1e40af; 
                    padding-bottom: 20px;
                }
                .logo { height: 90px; }
                h1 { color: #1e40af; margin: 10px 0 5px 0; }
                h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                p { margin-bottom: 14px; }
                @media print {
                    body { margin: 20px; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" alt="Hospital de Illapel" class="logo">
                <h1>UNIDAD PREQUIRÚRGICO</h1>
                <h2>HOSPITAL DE ILLAPEL</h2>
                <p><strong>Análisis Inteligente con IA</strong> • ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>

            <div style="margin-top: 30px;">
                ${contenido.replace(/\n/g, '<br>')}
            </div>

            <div style="margin-top: 60px; text-align: center; color: #64748b; font-size: 13px;">
                Generado automáticamente por el Sistema de Gestión Prequirúrgico
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 800);
}


// ====================== AUTO-RELLENO FOLIO SEGÚN GES ======================

// Función principal para el formulario (nuevo y edición)
function setupAutoFolioGES() {
    const gesSelect = document.getElementById('ges');
    const folioInput = document.getElementById('folio');

    if (!gesSelect || !folioInput) return;

    gesSelect.addEventListener('change', () => {
        if (gesSelect.value === 'SI') {
            folioInput.value = 'NO APLICA';
            folioInput.readOnly = true;
            folioInput.style.backgroundColor = '#f3f4f6';
        } else {
            if (folioInput.value === 'NO APLICA') {
                folioInput.value = '';
            }
            folioInput.readOnly = false;
            folioInput.style.backgroundColor = '';
        }
    });
}

// Aplicar al cargar el formulario
document.addEventListener('DOMContentLoaded', () => {
    setupAutoFolioGES();
});

// ====================== ACTUALIZAR REGISTROS EXISTENTES ======================
async function actualizarFolioEnRegistrosExistentes() {
    if (!confirm("⚠️ ¿Quieres actualizar TODOS los registros existentes?\n\nSe cambiará el Folio a 'NO APLICA' en aquellos donde GES = 'SI'.\n\nEsta acción es segura y solo se ejecuta una vez.")) {
        return;
    }

    let actualizados = 0;
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';

    try {
        const snapshot = await db.ref('patients').once('value');
        
        snapshot.forEach((child) => {
            const patient = child.val();
            const key = child.key;

            if (patient.ges === 'SI' && patient.folio !== 'NO APLICA') {
                db.ref('patients/' + key).update({
                    folio: 'NO APLICA'
                });
                actualizados++;
            }
        });

        alert(`✅ Proceso finalizado!\n\nRegistros actualizados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("Error al actualizar registros: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// Llamar después de editar paciente
const originalEditCurrentPatient = editCurrentPatient;
editCurrentPatient = function() {
    originalEditCurrentPatient.apply(this, arguments);
    setTimeout(() => {
        const gesSelect = document.getElementById('ges');
        const folioInput = document.getElementById('folio');
        if (gesSelect && folioInput && gesSelect.value === 'SI') {
            folioInput.value = 'NO APLICA';
            folioInput.readOnly = true;
            folioInput.style.backgroundColor = '#f3f4f6';
        }
    }, 300);
};

// ====================== GUARDAR FILTROS ACTUALES ======================
function guardarFiltrosActuales() {
    lastFilters = {
        busquedaGeneral: document.getElementById('busquedaGeneral')?.value || '',
        filterEspecialidad: document.getElementById('filterEspecialidad')?.value || '',
        filterMedico: document.getElementById('filterMedico')?.value || '',
        filterEstatus: document.getElementById('filterEstatus')?.value || '',
        filterFechaDesde: document.getElementById('filterFechaDesde')?.value || '',
        filterFechaHasta: document.getElementById('filterFechaHasta')?.value || '',
        soloSinFolio: soloSinFolio,
        mostrarDuplicados: mostrarDuplicados
    };
}

// ====================== RESTAURAR FILTROS ======================
function restaurarFiltros() {
    // Restaurar campos de texto y selects
    document.getElementById('busquedaGeneral').value = lastFilters.busquedaGeneral || '';
    document.getElementById('filterEspecialidad').value = lastFilters.filterEspecialidad || '';
    document.getElementById('filterMedico').value = lastFilters.filterMedico || '';
    document.getElementById('filterEstatus').value = lastFilters.filterEstatus || '';
    document.getElementById('filterFechaDesde').value = lastFilters.filterFechaDesde || '';
    document.getElementById('filterFechaHasta').value = lastFilters.filterFechaHasta || '';

    // Restaurar toggles
    soloSinFolio = lastFilters.soloSinFolio;
    mostrarDuplicados = lastFilters.mostrarDuplicados;

    // Actualizar botones visualmente
    const btnSinFolio = document.getElementById('btnSinFolio');
    if (btnSinFolio) {
        if (soloSinFolio) {
            btnSinFolio.style.background = '#eab308';
            btnSinFolio.style.color = 'black';
            btnSinFolio.textContent = '✅ Solo Sin Folio';
        } else {
            btnSinFolio.style.background = '';
            btnSinFolio.style.color = '';
            btnSinFolio.textContent = 'Sin Folio';
        }
    }

    const btnDuplicados = document.getElementById('btnDuplicados');
    if (btnDuplicados) {
        if (mostrarDuplicados) {
            btnDuplicados.style.background = '#eab308';
            btnDuplicados.style.color = 'black';
            btnDuplicados.textContent = '✅ Mostrando Duplicados';
        } else {
            btnDuplicados.style.background = '';
            btnDuplicados.style.color = '';
            btnDuplicados.textContent = 'Mostrar Duplicados (RUT)';
        }
    }

    // Aplicar los filtros restaurados
    filterPatients();
}




// ====================== GESTIÓN DE USUARIOS CON ROLES ======================
let currentUserRole = null;

function checkAdminAccess() {
    const usersMenu = document.getElementById('usersMenuItem');
    if (usersMenu) {
        usersMenu.style.display = (currentUserRole === 'admin') ? 'block' : 'none';
    }
}

// Cargar usuarios (solo si es admin)
// ====================== CARGAR USUARIOS ======================
// ====================== CARGAR USUARIOS ======================
// ====================== CARGAR USUARIOS (BOTONES BIEN ALINEADOS) ======================
function loadUsers() {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos.");
        showSection('dashboard');
        return;
    }

    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Cargando usuarios...</td></tr>';

    db.ref('users').once('value', (snapshot) => {
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:60px;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        snapshot.forEach((child) => {
            const user = child.val();
            const key = child.key;
            const isDisabled = user.role === 'disabled';

            const tr = document.createElement('tr');
            tr.style.backgroundColor = isDisabled ? '#fee2e2' : '';

            tr.innerHTML = `
                <td><strong>${user.email}</strong></td>
                <td>
                    <span style="padding:5px 12px; border-radius:20px; background:${isDisabled ? '#ef4444' : (user.role === 'admin' ? '#3b82f6' : '#10b981')}; color:white;">
                        ${isDisabled ? '🚫 Desactivado' : (user.role === 'admin' ? '🛡️ Admin' : '👤 Usuario')}
                    </span>
                </td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL') : '-'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-CL') : '-'}</td>
                <td style="white-space:nowrap;">
                    ${user.role !== 'admin' ? `
                        <button onclick="${isDisabled ? `reactivateUser('${key}', '${user.email}')` : `deactivateUser('${key}', '${user.email}')`}" 
                                style="background:${isDisabled ? '#10b981' : '#f59e0b'}; color:white; border:none; padding:6px 12px; border-radius:5px; margin-right:5px; cursor:pointer;">
                            ${isDisabled ? '🔄 Reactivar' : 'Desactivar'}
                        </button>
                        <button onclick="permanentlyDeleteUser('${key}', '${user.email}')" 
                                style="background:#b91c1c; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">
                            Eliminar
                        </button>
                    ` : `<span style="color:#94a3b8;">Protegido</span>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// ====================== DESACTIVAR USUARIO ======================
async function deactivateUser(userKey, email) {
    if (!confirm(`¿Desactivar al usuario?\n\n${email}`)) return;

    const clave = prompt("🔑 Ingresa clave de administrador:");
    if (clave !== "Adm123") return alert("❌ Clave incorrecta.");

    try {
        await db.ref('users/' + userKey).update({ role: "disabled" });
        alert(`✅ Usuario ${email} desactivado.`);
        loadUsers();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// ====================== ELIMINAR USUARIO PERMANENTEMENTE ======================
async function permanentlyDeleteUser(userKey, email) {
    if (!confirm(`⚠️ ¿ELIMINAR COMPLETAMENTE al usuario?\n\n${email}\n\nEsta acción es IRREVERSIBLE.`)) return;

    const clave = prompt("🔑 Ingresa clave de administrador:");
    if (clave !== "Adm123") return alert("❌ Clave incorrecta.");

    if (!confirm("¿Estás 100% seguro? Se borrará el registro para siempre.")) return;

    try {
        await db.ref('users/' + userKey).remove();
        alert(`✅ Usuario ${email} eliminado permanentemente.`);
        loadUsers();
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
}

// ====================== REACTIVAR USUARIO ======================
async function reactivateUser(userKey, email) {
    if (!confirm(`¿Reactivar al usuario?\n\n${email}`)) return;

    const clave = prompt("🔑 Ingresa clave de administrador:");
    if (clave !== "Adm123") return alert("❌ Clave incorrecta.");

    try {
        await db.ref('users/' + userKey).update({ role: "user" });
        alert(`✅ Usuario ${email} reactivado.`);
        loadUsers();
    } catch (error) {
        alert("Error: " + error.message);
    }
}




// ====================== CONVERTIR TU CUENTA EN ADMINISTRADOR ======================
// Ejecuta esto UNA SOLA VEZ (puedes ponerlo temporalmente en console o en un botón)

function convertirEnAdmin() {
    if (!currentUser) {
        alert("Debes iniciar sesión primero");
        return;
    }

    db.ref('users/' + currentUser.uid).set({
        email: currentUser.email,
        role: "admin",
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastLogin: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("✅ ¡Tu cuenta ahora es ADMINISTRADOR!");
        currentUserRole = 'admin';
        checkAdminAccess();
    });
}











function verificarUsuarios() {
    db.ref('users').once('value', (snapshot) => {
        console.log("Usuarios encontrados:", snapshot.val());
        if (snapshot.exists()) {
            alert("Sí hay usuarios. Cantidad: " + snapshot.numChildren());
        } else {
            alert("No hay usuarios guardados en la base de datos.");
        }
    });
}





// ====================== DESACTIVAR USUARIO ======================
async function deleteUser(userKey, email) {
    if (!confirm(`¿Desactivar al usuario?\n\n${email}`)) return;

    const clave = prompt("🔑 Ingresa clave de administrador:");
    if (clave !== "Adm123") return alert("❌ Clave incorrecta.");

    try {
        await db.ref('users/' + userKey).update({
            role: "disabled",
            deactivatedAt: firebase.database.ServerValue.TIMESTAMP,
            deactivatedBy: currentUser ? currentUser.email : 'Admin'
        });

        alert(`✅ Usuario ${email} desactivado correctamente.`);
        loadUsers();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// ====================== REACTIVAR USUARIO ======================
async function reactivateUser(userKey, email) {
    if (!confirm(`¿Reactivar al usuario?\n\n${email}`)) return;

    const clave = prompt("🔑 Ingresa clave de administrador:");
    if (clave !== "Adm123") return alert("❌ Clave incorrecta.");

    try {
        await db.ref('users/' + userKey).update({
            role: "user",
            reactivatedAt: firebase.database.ServerValue.TIMESTAMP,
            reactivatedBy: currentUser ? currentUser.email : 'Admin'
        });

        alert(`✅ Usuario ${email} reactivado correctamente.`);
        loadUsers();
    } catch (error) {
        alert("Error: " + error.message);
    }
}
