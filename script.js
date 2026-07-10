// ====================== FUNCIONES DE MENÚ RESPONSIVE ======================
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.style.display = 'block';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
}


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
let ocultarNoGestionables = false;

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
    today.setHours(0, 0, 0, 0);

    // Corregir fecha de inicio también
    let start;
    if (startDate.includes('-')) {
        const [y, m, d] = startDate.split('-').map(Number);
        start = new Date(y, m - 1, d);
    } else {
        start = new Date(startDate);
    }
    start.setHours(0, 0, 0, 0);

    return Math.ceil((today - start) / (1000 * 60 * 60 * 24));
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

// ====================== VALIDACIÓN DE RUT CHILENO ======================
function validarRutChileno(rut) {
    if (!rut) return false;
    
    // Limpiar el RUT (eliminar puntos, guiones y espacios)
    let rutLimpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
    
    // Verificar longitud mínima
    if (rutLimpio.length < 7) return false;
    
    // Separar dígito verificador
    const dv = rutLimpio.slice(-1);
    const numero = rutLimpio.slice(0, -1);
    
    // Verificar que el número sea válido
    if (!/^\d+$/.test(numero)) return false;
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero[i]) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    const resto = 11 - (suma % 11);
    let dvCalculado;
    
    if (resto === 11) {
        dvCalculado = '0';
    } else if (resto === 10) {
        dvCalculado = 'K';
    } else {
        dvCalculado = String(resto);
    }
    
    return dv === dvCalculado;
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return alert("Ingresa correo y contraseña");
    auth.signInWithEmailAndPassword(email, password).catch(err => alert("Error: " + err.message));
});


function logout() {
    if (confirm("¿Cerrar sesión?")) {
        // ✅ OCULTAR BOTÓN ANTES DE CERRAR SESIÓN
        document.getElementById('menuBtn').style.display = 'none';
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


// ====================== GUARDAR / ACTUALIZAR CON HISTORIAL INTELIGENTE ======================

let isSubmitting = false;   // ← Variable de bloqueo global (evita doble clic)

document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // === BLOQUEO CONTRA DOBLE ENVÍO ===
    if (isSubmitting) {
        console.log("Envío ya en progreso...");
        return;
    }

    // ========== VALIDAR RUT ANTES DE MOSTRAR MODAL ==========
    const rutInput = document.getElementById('rut').value;
    
    // PASO 1: Limpiar RUT (quitar puntos, guiones y espacios) para validar
    const rutLimpio = rutInput ? rutInput.replace(/[^0-9kK]/g, '').toUpperCase() : '';

    // PASO 2: Validar RUT limpio (debe ser obligatorio y válido)
    if (!rutLimpio || !validarRutChileno(rutLimpio)) {
        alert("❌ El RUT es obligatorio y debe ser válido.");
        document.getElementById('rut').focus();
        return;
    }
    
    // PASO 3: Formatear RUT limpio (agregar puntos y guión) para guardar
    const rutFormateado = formatRut(rutLimpio);

  
    // =========================================================

    isSubmitting = true;

    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';

    const patientData = {
        id: document.getElementById('patientId').value || Date.now().toString().slice(-6),
        estatusTabla: document.getElementById('estatusTabla').value,
        fechaIndQx: document.getElementById('fechaIndQx').value,
        nombreApellido: document.getElementById('nombreApellido').value.toUpperCase().trim(),
        rut: rutFormateado,
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
        fechaProximoLlamado: document.getElementById('fechaProximoLlamado').value,
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

        // Restaurar filtros
        setTimeout(() => {
            restaurarFiltros();
        }, 250);

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    } finally {
        isSubmitting = false;
        if (loading) loading.style.display = 'none';
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

        // ========== NUEVO: Orden por defecto ==========
        // Establecer ordenamiento por Fecha Indicación Qx descendente
        sortActive = true;
        currentSortColumn = 'fechaIndQx';
        currentSortOrder = 'desc';
        // =============================================

        renderPatientsTable(patients);
        updateDashboard();
        actualizarTablaLlamadosPendientes();
        cargarEspecialidadesEnFiltroDashboard();

        // Primero hacer sortable (asigna eventos click)
        setTimeout(() => {
            makeTableSortable();
            
            // Forzar la flecha en la columna por defecto después de renderizar
            const headers = document.querySelectorAll('#patientsTable th');
            const columnKeys = ['id', 'estatusTabla', 'fechaIndQx', 'tEspera', 'esperaProgram', 'nombreApellido', 'rut', 'edad', 'especialidad'];
            const fechaIndex = columnKeys.indexOf('fechaIndQx');
            
            // Limpiar todas las flechas primero
            headers.forEach(h => {
                h.textContent = h.textContent.replace(/ [↑↓]$/, '');
            });
            
            // Agregar flecha descendente a Fecha Ind. Qx
            if (fechaIndex !== -1 && headers[fechaIndex]) {
                headers[fechaIndex].textContent += ' ↓';
            }
        }, 100);

        // Restauración definitiva usando localStorage
        setTimeout(() => {
            restaurarFiltros();
        }, 300);
    });
}



// ====================== VARIABLES GLOBALES DE ORDENAMIENTO ======================
let currentCallPatient = null;  // Variable específica para llamadas
let currentSortColumn = null;
let currentSortOrder = 'asc';
let sortActive = false;
const RDLL_DB_PATH = 'rdll_historico';

// Para el gráfico de tendencia
let tendenciaChartInstance = null;

// Variable para filtro del dashboard
let dashboardFiltroEspecialidad = '';




// ====================== LISTAS DINÁMICAS PARA FILTROS (AGREGAR ESTO) ======================
let especialidadesLista = [];      // Nombres de especialidades
let medicosPorEspecialidad = {};   // Médicos por especialidad
let estatusTablaLista = [];        // Opciones de estatus
let estatusEpaLista = [];          // Opciones de estatus EPA
let anestesiologosLista = [];      // Lista de anestesiólogos
let comunasLista = [];             // Lista de comunas



// Ruta en Firebase para guardar configuraciones
const CONFIG_DB_PATH = 'configuracion/filtrosDinamicos';




// ====================== TABLA CON ORDENAMIENTO POR DEFECTO (T. Espera ASCENDENTE) ======================
function renderPatientsTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Si estamos mostrando duplicados, ordenar por RUT (sin importar el estado)
    if (mostrarDuplicados) {
        data.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    } 
    // SOLO ordenar si sortActive = true y hay una columna seleccionada
    else if (sortActive && currentSortColumn) {
        data.sort((a, b) => {
            let valA, valB;

            switch(currentSortColumn) {
                case 'tEspera':
                    if (fuentePercentilLista === 'fechaEstatusProgram') {
                        valA = calculateWaitingDays(a.fechaEstatusProgram);
                        valB = calculateWaitingDays(b.fechaEstatusProgram);
                    } else {
                        valA = calculateWaitingDays(a.fechaIndQx);
                        valB = calculateWaitingDays(b.fechaIndQx);
                    }
                    break;
                case 'esperaProgram':
                    valA = calculateWaitingDays(a.fechaEstatusProgram);
                    valB = calculateWaitingDays(b.fechaEstatusProgram);
                    break;
                case 'fechaIndQx':
                    valA = new Date(a.fechaIndQx || 0);
                    valB = new Date(b.fechaIndQx || 0);
                    break;
                case 'edad':
                    valA = parseInt(a.edad) || 0;
                    valB = parseInt(b.edad) || 0;
                    break;
                case 'id':
                    valA = (a.id || '').toString().toLowerCase();
                    valB = (b.id || '').toString().toLowerCase();
                    break;
                case 'estatusTabla':
                    valA = (a.estatusTabla || '').toString().toLowerCase();
                    valB = (b.estatusTabla || '').toString().toLowerCase();
                    break;
                case 'nombreApellido':
                    valA = (a.nombreApellido || '').toString().toLowerCase();
                    valB = (b.nombreApellido || '').toString().toLowerCase();
                    break;
                case 'rut':
                    valA = (a.rut || '').toString().toLowerCase();
                    valB = (b.rut || '').toString().toLowerCase();
                    break;
                case 'especialidad':
                    valA = (a.especialidad || '').toString().toLowerCase();
                    valB = (b.especialidad || '').toString().toLowerCase();
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
    // Si sortActive = false, NO se aplica ordenamiento (se mantiene el orden de Firebase)

    data.forEach((patient) => {
        const fechaFormateada = patient.fechaIndQx ? formatDate(patient.fechaIndQx) : '-';
        
        // Calcular días según la fuente seleccionada en la lista
        const diasEspera = fuentePercentilLista === 'fechaEstatusProgram' 
            ? calculateWaitingDays(patient.fechaEstatusProgram) 
            : calculateWaitingDays(patient.fechaIndQx);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${patient.id || '-'}</strong></td>
            <td>${patient.estatusTabla || '-'}</td>
            <td>${fechaFormateada}</td>
            <td><strong>${diasEspera}</strong></td>
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
// ====================== FORMATEO DE FECHA CORREGIDO (ZONA HORARIA) ======================
function formatDate(dateString) {
    if (!dateString) return '-';
    
    // === NUEVO: Si es número (fecha serial de Excel) ===
    if (typeof dateString === 'number') {
        // Excel: días desde 1/1/1900 (restando 25569 para ajustar a Unix)
        const fecha = new Date((dateString - 25569) * 86400000);
        if (!isNaN(fecha.getTime())) {
            const dayStr = String(fecha.getDate()).padStart(2, '0');
            const monthStr = String(fecha.getMonth() + 1).padStart(2, '0');
            const yearStr = fecha.getFullYear();
            return `${dayStr}/${monthStr}/${yearStr}`;
        }
        return String(dateString);
    }
    
    // === NUEVO: Si no es string, convertirlo ===
    if (typeof dateString !== 'string') {
        dateString = String(dateString);
    }
    
    // Si ya viene en formato DD/MM/YYYY, devolver tal cual
    if (dateString.includes('/') && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        return dateString;
    }
    
    // Formato DD-MM-YYYY (común en Excel chileno)
    if (dateString.match(/^\d{2}-\d{2}-\d{4}/)) {
        const [day, month, year] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // Crear fecha sin problema de timezone
    let date;
    
    if (dateString.includes('T')) {
        // Si viene con hora (de Firebase)
        date = new Date(dateString);
    } else if (dateString.includes('-') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Formato YYYY-MM-DD → forzar medianoche local
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return dateString;
    
    const dayStr = String(date.getDate()).padStart(2, '0');
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const yearStr = date.getFullYear();
    
    return `${dayStr}/${monthStr}/${yearStr}`;
}



// ====================== HACER ENCABEZADOS CLICABLES ======================
function makeTableSortable() {
    const headers = document.querySelectorAll('#patientsTable th');
    
    // Definir qué columnas pueden ordenarse
    const columnKeys = ['id', 'estatusTabla', 'fechaIndQx', 'tEspera', 'esperaProgram', 'nombreApellido', 'rut', 'edad', 'especialidad'];
    const sortableColumns = ['fechaIndQx', 'tEspera', 'esperaProgram', 'edad'];

    // ========== FUNCIÓN PARA ACTUALIZAR LAS FLECHAS ==========
    function actualizarFlechas() {
        // Limpiar TODAS las flechas
        headers.forEach(h => {
            h.textContent = h.textContent.replace(/ [↑↓]$/, '');
        });
        
        // Si hay una columna activa, mostrar su flecha
        if (sortActive && currentSortColumn) {
            const index = columnKeys.indexOf(currentSortColumn);
            if (index !== -1 && headers[index]) {
                const flecha = currentSortOrder === 'asc' ? ' ↑' : ' ↓';
                headers[index].textContent += flecha;
            }
        }
    }
    // =========================================================

    // Limpiar flechas al inicio
    actualizarFlechas();

    headers.forEach((th, index) => {
        const column = columnKeys[index];
        if (!column) return;

        // Si la columna NO está en sortableColumns, NO agregar evento click
        if (!sortableColumns.includes(column)) {
            th.style.cursor = 'default';
            return;
        }

        th.style.cursor = 'pointer';
        th.onclick = function() {
            // Si es la misma columna
            if (currentSortColumn === column) {
                if (currentSortOrder === 'asc') {
                    // 1er clic: asc → 2do clic: desc
                    currentSortOrder = 'desc';
                    sortActive = true;
                } else if (currentSortOrder === 'desc') {
                    // 2do clic: desc → 3er clic
                    // Si es la columna por defecto (fechaIndQx), cambiar a ASC
                    if (column === 'fechaIndQx') {
                        currentSortOrder = 'asc';
                        sortActive = true;
                    } else {
                        // Si es otra columna, restaurar orden por defecto
                        sortActive = true;
                        currentSortColumn = 'fechaIndQx';
                        currentSortOrder = 'desc';
                    }
                }
            } else {
                // Nueva columna: siempre asc
                currentSortColumn = column;
                currentSortOrder = 'asc';
                sortActive = true;
            }

            // Actualizar flechas
            actualizarFlechas();
            filterPatients();
        };
    });

    // ========== Marcar la columna por defecto (Fecha Ind. Qx) ==========
    if (sortActive && currentSortColumn === 'fechaIndQx') {
        const fechaIndex = columnKeys.indexOf('fechaIndQx');
        if (fechaIndex !== -1 && headers[fechaIndex]) {
            headers[fechaIndex].textContent = headers[fechaIndex].textContent.replace(/ [↑↓]$/, '');
            headers[fechaIndex].textContent += ' ↓';
        }
    }
}



// ====================== ACTUALIZAR DASHBOARD COMPLETO ======================
let especialidadChartInstance = null;
let estatusChartInstance = null;


// ====================== ACTUALIZAR DASHBOARD - TOTAL GESTIONABLES ======================

function updateDashboard() {
    // Aplicar filtro de especialidad si existe
    let pacientesFiltrados = patients;
    if (dashboardFiltroEspecialidad) {
        pacientesFiltrados = patients.filter(p => p.especialidad === dashboardFiltroEspecialidad);
    }
    
    // Definición de pacientes NO gestionables
    const noGestionables = ["EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO", "egreso", "rechazo", "traslado interno", "operado"];
    
    // Filtrar SOLO pacientes gestionables para la mayoría de métricas
    const pacientesGestionables = pacientesFiltrados.filter(p => {
        if (!p.estatusTabla) return true;
        const estatus = p.estatusTabla.toString().trim().toUpperCase();
        return !noGestionables.includes(estatus);

        const tiemposEspera = pacientesGestionables.map(p => {
    if (fuentePercentilDashboard === 'fechaEstatusProgram') {
        return calculateWaitingDays(p.fechaEstatusProgram);
    } else {
        return calculateWaitingDays(p.fechaIndQx);
    }
}).filter(t => t > 0);
    });
    
    // 1. Total de pacientes gestionables
    const totalGestionables = pacientesGestionables.length;
    document.getElementById('totalPatients').textContent = totalGestionables;
    



   // 2. Medianas de espera (solo gestionables)
const tiemposEspera = pacientesGestionables.map(p => {
    if (fuentePercentilDashboard === 'fechaEstatusProgram') {
        return calculateWaitingDays(p.fechaEstatusProgram);
    } else {
        return calculateWaitingDays(p.fechaIndQx);
    }
}).filter(t => t > 0);
const medianaGeneral = calcularMediana(tiemposEspera);
document.getElementById('medianaEsperaGeneral').innerHTML = `${medianaGeneral} <span style="font-size: 0.9rem;">días</span>`;

const tiemposEsperaProgram = pacientesGestionables.map(p => calculateWaitingDays(p.fechaEstatusProgram)).filter(t => t > 0);
const medianaProgramacion = calcularMediana(tiemposEsperaProgram);
document.getElementById('medianaEsperaProgramacion').innerHTML = `${medianaProgramacion} <span style="font-size: 0.9rem;">días</span>`;
    
   
   
   
   
    // ========== PERCENTILES Y RANGOS ==========
const estadisticas = calcularEstadisticasEspera(tiemposEspera, totalGestionables);

    // ← NUEVO: Guardar percentiles actualizados para el filtro de lista
    percentilesGlobales = {
        p25: estadisticas.p25.max,
        p50: estadisticas.p50.max,
        p75: estadisticas.p75.max,
        p90: estadisticas.p90.max
    };

// Actualizar percentiles en el DOM
const p25Valor = document.getElementById('percentil25Valor');
const p25Conteo = document.getElementById('percentil25Conteo');
const p50Valor = document.getElementById('percentil50Valor');
const p50Conteo = document.getElementById('percentil50Conteo');
const p75Valor = document.getElementById('percentil75Valor');
const p75Conteo = document.getElementById('percentil75Conteo');
const p90Valor = document.getElementById('percentil90Valor');
const p90Conteo = document.getElementById('percentil90Conteo');
const pRestoValor = document.getElementById('percentilRestoValor');
const pRestoConteo = document.getElementById('percentilRestoConteo');

if (p25Valor) p25Valor.innerHTML = `≤ ${estadisticas.p25.max} <span style="font-size: 0.8rem;">días</span>`;
if (p25Conteo) p25Conteo.innerHTML = `${estadisticas.p25.pacientes} pacientes`;

if (p50Valor) p50Valor.innerHTML = `${estadisticas.p50.min} - ${estadisticas.p50.max} <span style="font-size: 0.8rem;">días</span>`;
if (p50Conteo) p50Conteo.innerHTML = `${estadisticas.p50.pacientes} pacientes`;

if (p75Valor) p75Valor.innerHTML = `${estadisticas.p75.min} - ${estadisticas.p75.max} <span style="font-size: 0.8rem;">días</span>`;
if (p75Conteo) p75Conteo.innerHTML = `${estadisticas.p75.pacientes} pacientes`;

if (p90Valor) p90Valor.innerHTML = `${estadisticas.p90.min} - ${estadisticas.p90.max} <span style="font-size: 0.8rem;">días</span>`;
if (p90Conteo) p90Conteo.innerHTML = `${estadisticas.p90.pacientes} pacientes`;

if (pRestoValor) pRestoValor.innerHTML = `≥ ${estadisticas.resto.min} <span style="font-size: 0.8rem;">días</span>`;
if (pRestoConteo) pRestoConteo.innerHTML = `${estadisticas.resto.pacientes} pacientes`;

// Renderizar tabla de rangos de espera

// ========== FIN PERCENTILES ==========
    
    
    // 3. Prioridades (solo gestionables)
    const p1 = pacientesGestionables.filter(p => p.prioridad === 'P1').length;
    const p2 = pacientesGestionables.filter(p => p.prioridad === 'P2').length;
    const p3 = pacientesGestionables.filter(p => p.prioridad === 'P3').length;
    document.getElementById('prioridadP1').textContent = p1;
    document.getElementById('prioridadP2').textContent = p2;
    document.getElementById('prioridadP3').textContent = p3;
    
    // 4. GES (solo gestionables)
    const gesSi = pacientesGestionables.filter(p => p.ges === 'SI').length;
    const gesNo = pacientesGestionables.filter(p => p.ges === 'NO').length;
    document.getElementById('gesSi').textContent = gesSi;
    document.getElementById('gesNo').textContent = gesNo;
    
    // 5. Datos para gráficos (solo gestionables)
    const porEspecialidad = {};
    const porEstatus = {};
    
    pacientesGestionables.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        const est = p.estatusTabla || 'Sin Estatus';
        porEspecialidad[esp] = (porEspecialidad[esp] || 0) + 1;
        porEstatus[est] = (porEstatus[est] || 0) + 1;
    });
    
    // 6. Gráficos (solo gestionables)
    renderEspecialidadChart(porEspecialidad);
    renderEstatusChart(porEstatus);
    
    // 7. Tabla cruzada (TODOS los pacientes - incluye NO gestionables)
    const crossData = {};
    pacientesFiltrados.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        const est = p.estatusTabla || 'Sin Estatus';
        if (!crossData[esp]) crossData[esp] = {};
        crossData[esp][est] = (crossData[esp][est] || 0) + 1;
    });
    
    // Calcular porEstatus para la tabla cruzada (usando todos los pacientes)
    const porEstatusCompleto = {};
    pacientesFiltrados.forEach(p => {
        const est = p.estatusTabla || 'Sin Estatus';
        porEstatusCompleto[est] = (porEstatusCompleto[est] || 0) + 1;
    });
    
    const porEspecialidadCompleto = {};
    pacientesFiltrados.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        porEspecialidadCompleto[esp] = (porEspecialidadCompleto[esp] || 0) + 1;
    });
    
    renderCrossTable(crossData, porEspecialidadCompleto, porEstatusCompleto);
    
    // 8. Tabla de medianas por especialidad (solo gestionables)
    renderMedianasPorEspecialidad(pacientesGestionables);
    
    // 9. Top pacientes con mayor espera (solo gestionables)
    renderTopEspera(pacientesGestionables);
    
    // 10. Últimos pacientes registrados (solo gestionables)
    renderUltimosPacientes(pacientesGestionables);
    
    // 11. Gráfico de tendencia mensual (solo gestionables)
    renderTendenciaMensual(pacientesGestionables);
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


function showPatientModal(key) {
    currentModalPatient = patients.find(p => p.firebaseKey === key);
    if (!currentModalPatient) return;

    // Formateo de fechas
    const fechaIndQxFmt     = formatDate(currentModalPatient.fechaIndQx);
    const fechaNacFmt       = formatDate(currentModalPatient.fechaNac);
    const fechaEpaFmt       = formatDate(currentModalPatient.fechaEpa);
    const fechaEstatusProgFmt = formatDate(currentModalPatient.fechaEstatusProgram);
    const fechaCirugiaFmt   = formatDate(currentModalPatient.fechaCirugia);

    // Historial de modificaciones con opción de eliminar (solo admin)
    let historialHTML = '';
    if (currentModalPatient.historial) {
        const historialArray = Object.values(currentModalPatient.historial)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        historialHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📜 Historial de Modificaciones</h3>`;

        historialArray.forEach((h, index) => {
            const fecha = new Date(h.fecha);
            let cambiosHTML = h.cambios ? `<ul style="margin:10px 0 0 22px;">${h.cambios.map(c => `<li>${c}</li>`).join('')}</ul>` : '';
            
            const historialKey = Object.keys(currentModalPatient.historial).sort((a, b) => 
                new Date(currentModalPatient.historial[b].fecha) - new Date(currentModalPatient.historial[a].fecha)
            )[index];
            
            const botonEliminar = (currentUserRole === 'admin') ? `
                <button onclick="eliminarRegistroHistorial('${currentModalPatient.firebaseKey}', '${historialKey}')" 
                        style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:5px; margin-top:10px; cursor:pointer; font-size:0.75rem;">
                    🗑️ Eliminar este registro
                </button>
            ` : '';
            
            historialHTML += `
                <div style="margin-bottom:20px; padding:16px; background:#f8fafc; border-radius:10px; border-left:6px solid #3b82f6;">
                    <strong>${h.accion}</strong> — ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}
                    <br><small style="color:#64748b;">Usuario: ${h.usuario}</small>
                    ${cambiosHTML}
                    ${botonEliminar}
                </div>`;
        });
    }

    // ====================== HISTORIAL DE LLAMADAS ======================
    let historialLlamadasHTML = '';
    if (currentModalPatient.historialLlamadas) {
        const llamadasArray = Object.values(currentModalPatient.historialLlamadas)
            .sort((a, b) => new Date(b.fechaLlamada) - new Date(a.fechaLlamada));
        
        const llamadasKeys = Object.keys(currentModalPatient.historialLlamadas).sort((a, b) => 
            new Date(currentModalPatient.historialLlamadas[b].fechaLlamada) - new Date(currentModalPatient.historialLlamadas[a].fechaLlamada)
        );
        
        historialLlamadasHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📞 Historial de Llamadas</h3>`;
        
        llamadasArray.forEach((llamada, idx) => {
            const fechaLlamada = new Date(llamada.fechaLlamada);
            const llamadaKey = llamadasKeys[idx];
            
            historialLlamadasHTML += `
                <div style="margin-bottom:15px; padding:15px; background:#f0fdf4; border-radius:10px; border-left:6px solid #10b981; cursor:pointer;" onclick="verDetalleLlamada('${currentModalPatient.firebaseKey}', '${llamadaKey}')">
                    <strong>📞 Llamada:</strong> ${fechaLlamada.toLocaleDateString('es-CL')} ${fechaLlamada.toLocaleTimeString('es-CL')}<br>
                    <strong>Motivo:</strong> ${llamada.motivo || '-'}<br>
                    <strong>Respuesta:</strong> ${llamada.respuesta || '-'}<br>
                    <strong>Receptor:</strong> ${llamada.nombreRec || '-'}<br>
                    <small style="color:#64748b;">👆 Click para ver detalles completos</small>
                </div>
            `;
        });
    } else {
        historialLlamadasHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📞 Historial de Llamadas</h3>
        <p style="color:#64748b;">No hay registros de llamadas para este paciente.</p>`;
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
            <p><strong>📞 Próximo Llamado:</strong> ${currentModalPatient.fechaProximoLlamado ? formatDate(currentModalPatient.fechaProximoLlamado) : 'No programado'}</p>
        </div>

        <!-- 6. OBSERVACIONES -->
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px; border-left:6px solid #3b82f6;">
            📝 6. Observaciones
        </h3>
        <p><strong>Patologías Crónicas:</strong> ${currentModalPatient.patologiasCronicas || 'Ninguna'}</p>
        <p><strong>Medicamentos Crónicos:</strong> ${currentModalPatient.medicamentosCronicos || 'Ninguno'}</p>
        <p style="margin-top:18px;"><strong>Observaciones Generales:</strong><br>${currentModalPatient.observaciones || 'Sin observaciones'}</p>
        <p><strong>Indicaciones Anestesiólogo:</strong><br>${currentModalPatient.indicacionesAnest || 'Sin indicaciones'}</p>

        ${historialHTML}
        ${historialLlamadasHTML}
    `;

    document.getElementById('modalBody').innerHTML = html;
    
    // ✅ ACTUALIZAR EL BOTÓN DE REGISTRAR LLAMADA CON EL KEY DEL PACIENTE ACTUAL
    const btnLlamada = document.getElementById('btnRegistrarLlamadaModal');
    if (btnLlamada) {
        btnLlamada.setAttribute('onclick', `abrirModalRegistroLlamada('${currentModalPatient.firebaseKey}')`);
    }
    
    document.getElementById('patientModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('patientModal').style.display = 'none';
}


// ====================== EDITAR PACIENTE ======================
function editCurrentPatient() {
    if (!currentModalPatient) return;

    // Guardar filtros actuales del usuario (usando la nueva función)
    guardarFiltrosEnStorage();

    currentPatientKey = currentModalPatient.firebaseKey;
    closeModal();
    showSection('newPatient');

    // Mostrar botón cancelar
    document.getElementById('btnCancelarEdicion').style.display = 'block';

    // Llenar campos del formulario
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
        fechaCirugia: currentModalPatient.fechaCirugia,
        fechaProximoLlamado: currentModalPatient.fechaProximoLlamado,
    };

    Object.keys(campos).forEach(key => {
        const elemento = document.getElementById(key);
        if (elemento) {
            elemento.value = campos[key] || '';
        }
    });

    // ========== VALIDAR RUT AUTOMÁTICAMENTE AL CARGAR ==========
    const rutInput = document.getElementById('rut');
    if (rutInput && rutInput.value) {
        // Limpiar mensajes anteriores
        let msg = rutInput.nextElementSibling;
        if (msg && msg.classList && msg.classList.contains('rut-msg')) {
            msg.remove();
        }
        
        // Validar el RUT
        const rut = rutInput.value;
        const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
        
        if (!rutLimpio || !validarRutChileno(rutLimpio)) {
            rutInput.style.borderColor = '#ef4444';
            rutInput.style.backgroundColor = '#fee2e2';
            msg = document.createElement('small');
            msg.className = 'rut-msg';
            msg.style.color = '#ef4444';
            msg.style.display = 'block';
            msg.style.marginTop = '4px';
            msg.textContent = '❌ RUT inválido';
            rutInput.parentNode.appendChild(msg);
        } else {
            rutInput.style.borderColor = '#10b981';
            rutInput.style.backgroundColor = '#ecfdf5';
            msg = document.createElement('small');
            msg.className = 'rut-msg';
            msg.style.color = '#10b981';
            msg.style.display = 'block';
            msg.style.marginTop = '4px';
            msg.textContent = '✅ RUT válido';
            rutInput.parentNode.appendChild(msg);
        }
    }
    // =========================================================



    // Actualizar médico según especialidad
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

// ====================== ELIMINAR PACIENTE (MODAL FORZADO) ======================
function deleteCurrentPatient() {
    if (!currentModalPatient || !confirm("¿Estás seguro de eliminar este paciente? Esta acción es irreversible.")) {
        return;
    }

    // Guardar filtros del usuario actual
    guardarFiltrosEnStorage();

    // === FORZAR MODAL DE ESPERA ===
    const loading = document.getElementById('loadingModal');
    if (loading) {
        loading.style.display = 'flex';
        loading.style.zIndex = '999999';
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
        console.log("✅ Modal de eliminación de paciente FORZADO visible");
    } else {
        console.error("❌ No se encontró el elemento #loadingModal");
    }

    db.ref('patients/' + currentModalPatient.firebaseKey).remove()
        .then(() => {
            alert("✅ Paciente eliminado correctamente");
            closeModal();
            
            loadPatients(); 
            
            // Restaurar filtros del usuario
            setTimeout(() => {
                restaurarFiltros();
            }, 500);
        })
        .catch(err => {
            console.error(err);
            alert("Error al eliminar: " + err.message);
        })
        .finally(() => {
            const loadingClose = document.getElementById('loadingModal');
            if (loadingClose) {
                loadingClose.style.display = 'none';
                loadingClose.style.zIndex = '';
                console.log("✅ Modal de eliminación cerrado");
            }
        });
}
// ====================== NAVEGACIÓN ======================
function showSection(section) {
    closeSidebar();
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(section + 'Section').style.display = 'block';

    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    const active = Array.from(document.querySelectorAll('.sidebar li')).find(li => li.getAttribute('onclick').includes(section));
    if (active) active.classList.add('active');

    // === LÓGICA SEGÚN SECCIÓN ===
    //if (section === 'patientList') {
       // setTimeout(restaurarFiltros, 100);
    //}
    if (section === 'historicoRdll') {
    cargarRdll();
}
    else if (section === 'users') {
        setTimeout(loadUsers, 150);     // ← Importante: Cargar usuarios automáticamente
    }
}

function resetForm() {
    document.getElementById('patientForm').reset();
    currentPatientKey = null;

     // ✅ OCULTAR EL BOTÓN CANCELAR AL RESETEAR
    document.getElementById('btnCancelarEdicion').style.display = 'none';
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
     
        document.getElementById('mainApp').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email;

        // ✅ MOSTRAR BOTÓN HAMBURGUESA DESPUÉS DEL LOGIN
        document.getElementById('menuBtn').style.display = 'block';

        
        await cargarConfiguracionFiltros();
        loadPatients();
        showSection('dashboard');
    } else {
        currentUser = null;
        currentUserRole = null;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginSection').style.display = 'flex';
     
        document.getElementById('userInfo').style.display = 'none';

        // ✅ OCULTAR BOTÓN HAMBURGUESA AL CERRAR SESIÓN
        document.getElementById('menuBtn').style.display = 'none';
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
    // 1. Estatus Tabla (ahora usa la variable global estatusTablaLista)
    const estatusSelect = document.getElementById('estatusTabla');
    if (estatusSelect) {
        const valorActual = estatusSelect.value;
        estatusSelect.innerHTML = '<option value="">Seleccionar Estatus</option>';
        estatusTablaLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            estatusSelect.appendChild(option);
        });
        if (valorActual && estatusTablaLista.includes(valorActual)) estatusSelect.value = valorActual;
    }

    // 2. Estatus EPA (usa lista dinámica)
    const estatusEpaSelect = document.getElementById('estatusEpa');
    if (estatusEpaSelect) {
        const valorActual = estatusEpaSelect.value;
        estatusEpaSelect.innerHTML = '<option value="">Seleccionar</option>';
        estatusEpaLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            estatusEpaSelect.appendChild(option);
        });
        if (valorActual && estatusEpaLista.includes(valorActual)) estatusEpaSelect.value = valorActual;
    }

    // 3. Anestesiólogo (usa lista dinámica)
    const anestesiologoSelect = document.getElementById('anestesiologo');
    if (anestesiologoSelect) {
        const valorActual = anestesiologoSelect.value;
        anestesiologoSelect.innerHTML = '<option value="">Seleccionar Anestesiólogo</option>';
        anestesiologosLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            anestesiologoSelect.appendChild(option);
        });
        if (valorActual && anestesiologosLista.includes(valorActual)) anestesiologoSelect.value = valorActual;
    }

    // 4. GES, TACO, ASA, EKG, RX, ECO (estos NO cambian - son SI/NO/NO APLICA)
    const camposSiNo = ['ges', 'taco', 'asa', 'ekg', 'rx', 'eco'];
    camposSiNo.forEach(campo => {
        const select = document.getElementById(campo);
        if (select) {
            const valorActual = select.value;
            select.innerHTML = `
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
                <option value="NO APLICA">NO APLICA</option>
            `;
            if (valorActual) select.value = valorActual;
        }
    });

    // 5. Comuna (usa lista dinámica)
    const comunaSelect = document.getElementById('comuna');
    if (comunaSelect) {
        const valorActual = comunaSelect.value;
        comunaSelect.innerHTML = '<option value="">Seleccionar Comuna</option>';
        comunasLista.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            comunaSelect.appendChild(opt);
        });
        if (valorActual && comunasLista.includes(valorActual)) comunaSelect.value = valorActual;
    }

    // 6. Especialidad (usa lista dinámica)
    const especialidadSelect = document.getElementById('especialidad');
    if (especialidadSelect) {
        const valorActual = especialidadSelect.value;
        especialidadSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>';
        especialidadesLista.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            especialidadSelect.appendChild(opt);
        });
        if (valorActual && especialidadesLista.includes(valorActual)) especialidadSelect.value = valorActual;
    }

    // 7. Lateralidad (NO cambia - valores fijos)
    const lateralidadSelect = document.getElementById('lateralidad');
    if (lateralidadSelect) {
        lateralidadSelect.innerHTML = `
            <option value="NO APLICA">NO APLICA</option>
            <option value="DERECHA">DERECHA</option>
            <option value="IZQUIERDA">IZQUIERDA</option>
            <option value="BILATERAL">BILATERAL</option>
        `;
    }

    // 8. Prioridad (NO cambia - valores fijos)
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
    setupRutValidation();
});




// ====================== CARGAR FILTROS ======================
function cargarFiltrosLista() {
    // Especialidad
    const filterEsp = document.getElementById('filterEspecialidad');
    if (filterEsp) {
        filterEsp.innerHTML = '<option value="">Todas las Especialidades</option>';
        especialidadesLista.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            filterEsp.appendChild(opt);
        });
    }
    
    // Médicos (vacío inicialmente, se llena al seleccionar especialidad)
    const filterMedico = document.getElementById('filterMedico');
    if (filterMedico) {
        filterMedico.innerHTML = '<option value="">Todos los Médicos</option>';
    }
    
    // Estatus Tabla
    const filterEstatus = document.getElementById('filterEstatus');
    if (filterEstatus) {
        filterEstatus.innerHTML = '<option value="">Todos los Estatus</option>';
        estatusTablaLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            filterEstatus.appendChild(option);
        });
    }
    
    // ========== NUEVO: FILTRO POR COMUNA ==========
    const filterComuna = document.getElementById('filterComuna');
    if (filterComuna) {
        filterComuna.innerHTML = '<option value="">Todas las Comunas</option>';
        comunasLista.forEach(comuna => {
            const option = document.createElement('option');
            option.value = comuna;
            option.textContent = comuna;
            filterComuna.appendChild(option);
        });
    }
}

// Actualizar Médicos según Especialidad (VERSIÓN DINÁMICA)
document.getElementById('filterEspecialidad').addEventListener('change', function() {
    const medicoFilter = document.getElementById('filterMedico');
    const especialidad = this.value;
    
    medicoFilter.innerHTML = '<option value="">Todos los Médicos</option>';
    
    if (especialidad && medicosPorEspecialidad[especialidad]) {
        medicosPorEspecialidad[especialidad].forEach(med => {
            const opt = document.createElement('option');
            opt.value = med;
            opt.textContent = med;
            medicoFilter.appendChild(opt);
        });
    }
});

// === AGREGAR EL NUEVO EVENT LISTENER AQUÍ ===
document.getElementById('filterPercentil')?.addEventListener('change', function() {
    filtroPercentil = this.value;
    filterPatients();
});


// ====================== VARIABLES GLOBALES DE FILTROS ======================
let soloSinFolio = false;
let mostrarDuplicados = false;
let filtroPercentil = '';
let percentilesGlobales = { p25: 0, p50: 0, p75: 0, p90: 0 };

// Fuentes independientes para Dashboard y Lista de Pacientes
let fuentePercentilDashboard = 'fechaIndQx';  // Para Dashboard (radios)
let fuentePercentilLista = 'fechaIndQx';      // Para Lista de pacientes (select)


// ====================== FILTRADO PRINCIPAL ======================
function filterPatients() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad').value;
    const medico = document.getElementById('filterMedico').value;
    const estatus = document.getElementById('filterEstatus').value;
     const prioridad = document.getElementById('filterPrioridad')?.value || '';
     const ges = document.getElementById('filterGes')?.value || ''; 
    const comuna = document.getElementById('filterComuna')?.value || '';
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
        if (prioridad && p.prioridad !== prioridad) pasa = false;
         if (ges && p.ges !== ges) pasa = false;
        if (comuna && p.comuna !== comuna) pasa = false;

        if (fechaDesde || fechaHasta) {
            const fechaInd = new Date(p.fechaIndQx || 0);
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
        }

        if (soloSinFolio) {
            const folio = (p.folio || '').toString().trim();
            if (folio !== '') pasa = false;
        }

        if (soloSinProgramacion) {
            const fechaEstatusProgram = p.fechaEstatusProgram || '';
            if (fechaEstatusProgram.trim() !== '') pasa = false;
        }

if (ocultarNoGestionables) {
            const noGestionables = ["EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO", "egreso", "rechazo", "traslado interno", "operado"];
            const estatusPaciente = (p.estatusTabla || '').toString().trim().toUpperCase();
            if (noGestionables.includes(estatusPaciente)) {
                pasa = false;
            }
        }






    // Filtrar por percentil
if (filtroPercentil) {
    let dias;
    if (fuentePercentilLista === 'fechaEstatusProgram') {
        dias = calculateWaitingDays(p.fechaEstatusProgram);
    } else {
        dias = calculateWaitingDays(p.fechaIndQx);
    }
    
    if (dias <= 0) {
        pasa = false;
    } else if (filtroPercentil === 'p25' && dias > percentilesGlobales.p25) {
        pasa = false;
    } else if (filtroPercentil === 'p50' && (dias <= percentilesGlobales.p25 || dias > percentilesGlobales.p50)) {
        pasa = false;
    } else if (filtroPercentil === 'p75' && (dias <= percentilesGlobales.p50 || dias > percentilesGlobales.p75)) {
        pasa = false;
    } else if (filtroPercentil === 'p90' && (dias <= percentilesGlobales.p75 || dias > percentilesGlobales.p90)) {
        pasa = false;
    } else if (filtroPercentil === 'resto' && dias <= percentilesGlobales.p90) {
        pasa = false;
    }
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

    //guardarFiltrosActuales();
    guardarFiltrosEnStorage();
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
    guardarFiltrosEnStorage();
    
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
    guardarFiltrosEnStorage();
}


function toggleNoGestionables() {
    ocultarNoGestionables = !ocultarNoGestionables;
    const btn = document.getElementById('btnNoGestionables');
    
    if (btn) {
        if (ocultarNoGestionables) {
            btn.style.background = '#dc2626';
            btn.style.color = 'white';
            btn.textContent = '✅ Ocultando No Gestionables';
        } else {
            btn.style.background = '#64748b';
            btn.style.color = 'white';
            btn.textContent = '🚫 Ocultar No Gestionables';
        }
    }
    
    filterPatients();
    guardarFiltrosEnStorage();
}

// ====================== LIMPIAR FILTROS ======================
function clearFilters() {
    soloSinFolio = false;
    mostrarDuplicados = false;
    ocultarNoGestionables = false;
    soloSinProgramacion = false;
    filtroPercentil = '';

    document.getElementById('busquedaGeneral').value = '';
    document.getElementById('filterEspecialidad').value = '';
    document.getElementById('filterMedico').value = '';
    document.getElementById('filterEstatus').value = '';
    document.getElementById('filterPrioridad').value = '';
    document.getElementById('filterGes').value = '';
    document.getElementById('filterComuna').value = '';
    document.getElementById('filterFechaDesde').value = '';
    document.getElementById('filterFechaHasta').value = '';
    document.getElementById('filterPercentil').value = '';

    fuentePercentilLista = 'fechaIndQx';
    const selectFuente = document.getElementById('fuentePercentilLista');
    if (selectFuente) {
        selectFuente.value = 'fechaIndQx';
        selectFuente.dispatchEvent(new Event('change'));  // Forzar actualización visual
    }

    // ========== Restablecer ordenamiento a orden por defecto ==========
    sortActive = true;
    currentSortColumn = 'fechaIndQx';
    currentSortOrder = 'desc';
    
    // Actualizar las flechas de los encabezados
    makeTableSortable();
    // =================================================================

    const btnSinFolio = document.getElementById('btnSinFolio');
    const btnDuplicados = document.getElementById('btnDuplicados');
    const btnSinProgramacion = document.getElementById('btnSinProgramacion');
    const btnNoGestionables = document.getElementById('btnNoGestionables');
    
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
    if (btnSinProgramacion) {
        btnSinProgramacion.style.background = '';
        btnSinProgramacion.style.color = '';
        btnSinProgramacion.textContent = '📅 Sin Fecha Programación';
    }
    if (btnNoGestionables) {
        btnNoGestionables.style.background = '#64748b';
        btnNoGestionables.style.color = 'white';
        btnNoGestionables.textContent = '🚫 Ocultar No Gestionables';
    }



    if (typeof soloSinProgramacion !== 'undefined' && soloSinProgramacion) {
        filtered = filtered.filter(p => {
            const fechaEstatusProgram = (p.fechaEstatusProgram || '').toString().trim();
            return fechaEstatusProgram === '';
        });
    }
    
    filterPatients();
}




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

// ====================== OBTENER DATOS FILTRADOS (VERSIÓN COMPLETA) ======================
function getCurrentFilteredData() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const ges = document.getElementById('filterGes')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';

    let filtered = [...patients];

    // 1. Búsqueda general
    if (busqueda) {
        filtered = filtered.filter(p => {
            const texto = `${p.nombreApellido || ''} ${p.rut || ''} ${p.diagnostico || ''} ${p.intervencion || ''} ${p.especialidad || ''} ${p.medicoTratante || ''}`.toLowerCase();
            return texto.includes(busqueda);
        });
    }

    // 2. Filtros exactos
    if (especialidad) filtered = filtered.filter(p => p.especialidad === especialidad);
    if (medico) filtered = filtered.filter(p => p.medicoTratante === medico);
    if (estatus) filtered = filtered.filter(p => p.estatusTabla === estatus);
    if (prioridad) filtered = filtered.filter(p => p.prioridad === prioridad);
    if (ges) filtered = filtered.filter(p => p.ges === ges);
    if (comuna) filtered = filtered.filter(p => p.comuna === comuna);

    // 3. Rango de fechas
    if (fechaDesde || fechaHasta) {
        filtered = filtered.filter(p => {
            const fechaInd = new Date(p.fechaIndQx || 0);
            let pasa = true;
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
            return pasa;
        });
    }

    // 4. Solo Sin Folio
    if (soloSinFolio) {
        filtered = filtered.filter(p => {
            const folio = (p.folio || '').toString().trim();
            return folio === '';
        });
    }

    // 5. Solo Sin Programación
    if (soloSinProgramacion) {
        filtered = filtered.filter(p => {
            const fechaEstatusProgram = (p.fechaEstatusProgram || '').toString().trim();
            return fechaEstatusProgram === '';
        });
    }

    // 6. Ocultar No Gestionables
    if (ocultarNoGestionables) {
        const noGestionables = ["EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO", "egreso", "rechazo", "traslado interno", "operado"];
        filtered = filtered.filter(p => {
            const estatusPaciente = (p.estatusTabla || '').toString().trim().toUpperCase();
            return !noGestionables.includes(estatusPaciente);
        });
    }

    // 7. Filtro por Percentil
    if (filtroPercentil) {
        filtered = filtered.filter(p => {
            let dias;
            if (fuentePercentilLista === 'fechaEstatusProgram') {
                dias = calculateWaitingDays(p.fechaEstatusProgram);
            } else {
                dias = calculateWaitingDays(p.fechaIndQx);
            }
            
            if (dias <= 0) return false;
            
            if (filtroPercentil === 'p25' && dias > percentilesGlobales.p25) return false;
            if (filtroPercentil === 'p50' && (dias <= percentilesGlobales.p25 || dias > percentilesGlobales.p50)) return false;
            if (filtroPercentil === 'p75' && (dias <= percentilesGlobales.p50 || dias > percentilesGlobales.p75)) return false;
            if (filtroPercentil === 'p90' && (dias <= percentilesGlobales.p75 || dias > percentilesGlobales.p90)) return false;
            if (filtroPercentil === 'resto' && dias <= percentilesGlobales.p90) return false;
            
            return true;
        });
    }

    // 8. Duplicados
    if (mostrarDuplicados) {
        const rutCount = {};
        filtered.forEach(p => {
            if (p.rut) rutCount[p.rut] = (rutCount[p.rut] || 0) + 1;
        });
        filtered = filtered.filter(p => p.rut && rutCount[p.rut] > 1);
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    return filtered;
}

// ====================== DESCARGAR COMO CSV (ACTUALIZADO) ======================
function downloadCSV() {
    const data = getCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar con los filtros actuales.");

    let csvContent = "ID;Estatus Tabla;T.Espera;Fecha Ind Qx;Nombre y Apellido;RUT;Edad;Comuna;Especialidad;Médico Tratante;Diagnóstico;Intervención;Fecha Cirugía;Observaciones\n";

    data.forEach(p => {
        const tEspera = calcularDiasEspera(p.fechaIndQx);
        csvContent += `"${p.id || ''}";"${p.estatusTabla || ''}";"${tEspera}";"${p.fechaIndQx || ''}";"${p.nombreApellido || ''}";"${p.rut || ''}";"${p.edad || ''}";"${p.comuna || ''}";"${p.especialidad || ''}";"${p.medicoTratante || ''}";"${p.diagnostico || ''}";"${p.intervencion || ''}";"${p.fechaCirugia || ''}";"${(p.observaciones || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Pacientes_Filtrados_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();

    alert(`✅ CSV descargado (${data.length} registros con filtros aplicados)`);
}

// ====================== DESCARGAR EXCEL COMPLETO (ACTUALIZADO) ======================
function downloadExcel() {
    const data = getCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar con los filtros actuales.");

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
    XLSX.writeFile(wb, `Pacientes_Filtrados_${new Date().toISOString().slice(0,10)}.xlsx`);

    alert(`✅ Excel completo descargado correctamente (${data.length} registros con filtros aplicados)`);
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




// ====================== IMPRIMIR DASHBOARD PROFESIONAL (ACTUALIZADO) ======================
function printDashboard() {
    const totalGestionables = document.getElementById('totalPatients').textContent;
    const medianaGeneral = document.getElementById('medianaEsperaGeneral').innerHTML;
    const medianaProgramacion = document.getElementById('medianaEsperaProgramacion').innerHTML;
    const prioridadP1 = document.getElementById('prioridadP1').textContent;
    const prioridadP2 = document.getElementById('prioridadP2').textContent;
    const prioridadP3 = document.getElementById('prioridadP3').textContent;
    const gesSi = document.getElementById('gesSi').textContent;
    const gesNo = document.getElementById('gesNo').textContent;
    
    // Obtener la tabla de medianas por especialidad
    const medianasTable = document.getElementById('medianasTable');
    const topEsperaTable = document.getElementById('topEsperaTable');
    const ultimosPacientesTable = document.getElementById('ultimosPacientesTable');
    const crossTable = document.getElementById('crossTable');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Dashboard - Unidad Prequirúrgico</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Roboto', Arial, sans-serif;
                    margin: 20px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #1e2937;
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 4px solid #1e40af;
                    padding-bottom: 15px;
                }
                .logo {
                    height: 70px;
                }
                h1 {
                    font-size: 22px;
                    margin: 8px 0 4px 0;
                    color: #1e40af;
                }
                h2 {
                    font-size: 16px;
                    margin: 5px 0;
                    color: #334155;
                }
                h3 {
                    font-size: 14px;
                    margin: 15px 0 10px 0;
                    color: #1e40af;
                    border-left: 4px solid #3b82f6;
                    padding-left: 10px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                }
                .stat-card {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    text-align: center;
                    border: 1px solid #e2e8f0;
                }
                .total-card {
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    color: white;
                }
                .mediana-card {
                    background: linear-gradient(135deg, #059669, #10b981);
                    color: white;
                }
                .mediana-card2 {
                    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
                    color: white;
                }
                .big-number {
                    font-size: 32px;
                    font-weight: 700;
                    margin: 10px 0 0 0;
                }
                .stats-mini {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                }
                .priority-group, .ges-group {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 10px;
                }
                .priority-item, .ges-item {
                    text-align: center;
                }
                .priority-color {
                    display: inline-block;
                    width: 25px;
                    height: 25px;
                    border-radius: 50%;
                }
                .charts-print {
                    display: flex;
                    gap: 15px;
                    margin: 20px 0;
                }
                .chart-print {
                    flex: 1;
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    border-radius: 8px;
                    text-align: center;
                }
                .chart-print img {
                    width: 100%;
                    max-height: 220px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 11px;
                }
                th, td {
                    border: 1px solid #94a3b8;
                    padding: 8px 6px;
                    text-align: center;
                }
                th {
                    background: #1e40af;
                    color: white;
                    font-weight: 600;
                }
                tr:nth-child(even) {
                    background: #f8fafc;
                }
                .footer {
                    margin-top: 35px;
                    text-align: center;
                    font-size: 10px;
                    color: #64748b;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 15px;
                }
                @media print {
                    body {
                        margin: 10px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" alt="Hospital Illapel" class="logo" onerror="this.style.display='none'">
                <h1>FICHA DASHBOARD - UNIDAD PREQUIRÚRGICO</h1>
                <h2>HOSPITAL DE ILLAPEL</h2>
                <h3>RESUMEN GENERAL DE PACIENTES</h3>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>

            <!-- Estadísticas principales -->
            <div class="stats-grid">
                <div class="stat-card total-card">
                    <h3>Total Pacientes Gestionables</h3>
                    <p class="big-number">${totalGestionables}</p>
                </div>
                <div class="stat-card mediana-card">
                    <h3>📊 Mediana de Espera General</h3>
                    <p class="big-number" style="font-size: 28px;">${medianaGeneral}</p>
                </div>
                <div class="stat-card mediana-card2">
                    <h3>📊 Mediana Espera Programación</h3>
                    <p class="big-number" style="font-size: 28px;">${medianaProgramacion}</p>
                </div>
            </div>

            <!-- Prioridades y GES -->
            <div class="stats-mini">
                <div class="stat-card">
                    <h3>🔄 Pacientes por Prioridad</h3>
                    <div class="priority-group">
                        <div class="priority-item">
                            <span class="priority-color" style="background: #ef4444;"></span>
                            <div><strong>P1</strong></div>
                            <div style="font-size: 22px; font-weight: 700;">${prioridadP1}</div>
                        </div>
                        <div class="priority-item">
                            <span class="priority-color" style="background: #f59e0b;"></span>
                            <div><strong>P2</strong></div>
                            <div style="font-size: 22px; font-weight: 700;">${prioridadP2}</div>
                        </div>
                        <div class="priority-item">
                            <span class="priority-color" style="background: #10b981;"></span>
                            <div><strong>P3</strong></div>
                            <div style="font-size: 22px; font-weight: 700;">${prioridadP3}</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <h3>✅ GES vs NO GES</h3>
                    <div class="ges-group">
                        <div class="ges-item">
                            <span class="priority-color" style="background: #3b82f6;"></span>
                            <div><strong>GES SI</strong></div>
                            <div style="font-size: 22px; font-weight: 700;">${gesSi}</div>
                        </div>
                        <div class="ges-item">
                            <span class="priority-color" style="background: #94a3b8;"></span>
                            <div><strong>GES NO</strong></div>
                            <div style="font-size: 22px; font-weight: 700;">${gesNo}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráficos -->
            <div class="charts-print">
                <div class="chart-print">
                    <h3>Pacientes por Especialidad</h3>
                    <img src="${document.getElementById('especialidadChart').toDataURL()}" alt="Gráfico Especialidad">
                </div>
                <div class="chart-print">
                    <h3>Pacientes por Estatus Tabla</h3>
                    <img src="${document.getElementById('estatusChart').toDataURL()}" alt="Gráfico Estatus">
                </div>
            </div>

            <!-- Gráfico de tendencia -->
            <div class="chart-print" style="margin: 20px 0;">
                <h3>📈 Ingresos por Mes (Fecha Indicación Qx)</h3>
                <img src="${document.getElementById('tendenciaChart')?.toDataURL() || ''}" alt="Gráfico Tendencia" style="max-width: 100%;">
            </div>

            <!-- Medianas por especialidad -->
            <h3>📊 Medianas de Espera por Especialidad</h3>
            ${medianasTable ? medianasTable.outerHTML : '<p>No hay datos disponibles</p>'}

            <!-- Tabla cruzada -->
            <h3>📊 Pacientes por Especialidad vs Estatus</h3>
            ${crossTable ? crossTable.outerHTML : '<p>No hay datos disponibles</p>'}

            <!-- Top pacientes con mayor espera -->
            <h3>⚠️ Pacientes con Mayor Tiempo de Espera</h3>
            ${topEsperaTable ? topEsperaTable.outerHTML : '<p>No hay datos disponibles</p>'}

            <!-- Últimos pacientes registrados -->
            <h3>🆕 Últimos 5 Pacientes Registrados</h3>
            ${ultimosPacientesTable ? ultimosPacientesTable.outerHTML : '<p>No hay datos disponibles</p>'}

            <div class="footer">
                Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel
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




// ====================== RESTAURAR FILTROS (VERSIÓN FINAL ROBUSTA) ======================
function restaurarFiltros() {
    console.log("🔄 Restaurando filtros:", lastFilters);
    
    if (!lastFilters) {
        console.warn("⚠️ lastFilters no está inicializado");
        return;
    }

    // Pequeño delay para que los selects dinámicos (especialidades, médicos, etc.) terminen de cargar
    setTimeout(() => {
        // 1. Restaurar campos principales
        const campos = [
            'busquedaGeneral', 'filterEspecialidad', 'filterMedico', 'filterEstatus',
            'filterComuna', 'filterFechaDesde', 'filterFechaHasta', 'filterPercentil'
        ];

        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = lastFilters[id] || '';
            }
        });

        // 2. Restaurar variables globales
        soloSinFolio = !!lastFilters.soloSinFolio;
        mostrarDuplicados = !!lastFilters.mostrarDuplicados;
        soloSinProgramacion = !!lastFilters.soloSinProgramacion;
        filtroPercentil = lastFilters.filtroPercentil || '';

       
        fuentePercentilLista = lastFilters.fuentePercentilLista || 'fechaIndQx';

        // 3. Sincronizar controles visuales
   
        const selectLista = document.getElementById('fuentePercentilLista');

  
        if (selectLista) selectLista.value = fuentePercentilLista;

        // 4. Actualizar botones visuales
        actualizarBotonesFiltrosVisuales();

        // 5. Aplicar los filtros restaurados
        filterPatients();

        console.log("✅ Filtros restaurados correctamente");
    }, 400); // Aumentado ligeramente para mayor estabilidad
}

// ====================== ACTUALIZAR BOTONES VISUALES ======================
function actualizarBotonesFiltrosVisuales() {
    // Sin Folio
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

    // Duplicados
    const btnDuplicados = document.getElementById('btnDuplicados');
    if (btnDuplicados) {
        if (mostrarDuplicados) {
            btnDuplicados.style.background = '#eab308';
            btnDuplicados.style.color = 'black';
            btnDuplicados.textContent = '✅ Mostrando Duplicados';
        } else {
            btnDuplicados.style.background = '';
            btnDuplicados.style.color = '';
            btnDuplicados.textContent = 'Duplicados (RUT)';
        }
    }

    // Sin Programación
    const btnSinProgramacion = document.getElementById('btnSinProgramacion');
    if (btnSinProgramacion) {
        if (soloSinProgramacion) {
            btnSinProgramacion.style.background = '#eab308';
            btnSinProgramacion.style.color = 'black';
            btnSinProgramacion.textContent = '✅ Solo Sin Fecha Programación';
        } else {
            btnSinProgramacion.style.background = '';
            btnSinProgramacion.style.color = '';
            btnSinProgramacion.textContent = '📅 Sin Fecha Prog';
        }
    }

    // No Gestionables 
 const btnNoGestionables = document.getElementById('btnNoGestionables');
    if (btnNoGestionables) {
        if (ocultarNoGestionables) {
            btnNoGestionables.style.background = '#dc2626';
            btnNoGestionables.style.color = 'white';
            btnNoGestionables.textContent = '✅ Ocultando No Gestionables';
        } else {
            btnNoGestionables.style.background = '#64748b';
            btnNoGestionables.style.color = 'white';
            btnNoGestionables.textContent = '🚫 Ocultar No Gestionables';
        }
    }
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
                      
                    ` : `<span style="color:#94a3b8;">Protegido</span>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
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
async function deactivateUser(userKey, email) {
    if (!confirm(`¿Desactivar al usuario?\n\n${email}`)) return;

    try {
        await db.ref('users/' + userKey).update({ 
            role: "disabled",
            deactivatedAt: firebase.database.ServerValue.TIMESTAMP,
            deactivatedBy: currentUser ? currentUser.email : 'Admin'
        });
        alert(`✅ Usuario ${email} desactivado.`);
        loadUsers();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// ====================== REACTIVAR USUARIO ======================
async function reactivateUser(userKey, email) {
    if (!confirm(`¿Reactivar al usuario?\n\n${email}`)) return;

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

// ====================== CANCELAR EDICIÓN ======================
function cancelarEdicion() {
    if (confirm("¿Cancelar la edición? Los cambios no guardados se perderán.")) {
        // Limpiar el formulario
        resetForm();
        
        // Ocultar el botón de cancelar
        document.getElementById('btnCancelarEdicion').style.display = 'none';
        
        // Redirigir a la lista de pacientes
        showSection('patientList');
        
        // Limpiar la variable global
        currentPatientKey = null;
        currentModalPatient = null;
    }
}

// ====================== CARGAR CONFIGURACIÓN DESDE FIREBASE ======================
async function cargarConfiguracionFiltros() {
    try {
        const snapshot = await db.ref(CONFIG_DB_PATH).once('value');
        const data = snapshot.val();
        
        if (data) {
            if (data.especialidades) especialidadesLista = data.especialidades;
            if (data.medicosPorEspecialidad) medicosPorEspecialidad = data.medicosPorEspecialidad;
            if (data.estatusTabla) estatusTablaLista = data.estatusTabla;
            
            // ========== NUEVAS LÍNEAS ==========
            if (data.estatusEpa) estatusEpaLista = data.estatusEpa;
            if (data.anestesiologos) anestesiologosLista = data.anestesiologos;
            if (data.comunas) comunasLista = data.comunas;
            // ==================================
        }
        
        // Si no hay datos, usar valores por defecto
        if (especialidadesLista.length === 0) {
            especialidadesLista = Object.keys(especialistas);
        }
        
        if (Object.keys(medicosPorEspecialidad).length === 0) {
            medicosPorEspecialidad = JSON.parse(JSON.stringify(especialistas));
        }
        
        if (estatusTablaLista.length === 0) {
            estatusTablaLista = ['PROGRAMABLE','PENDIENTE EPA','NO PROGRAMABLE','ACTUALIZAR','CARTA CERTIFICADA','OPERADO','EGRESO','TRASLADO INTERNO','RECHAZO','EXCEPTUADO TRANSITORIO','EXCEPTUADO POR RECHAZO','EXCEPTUADO INUBICABLE'];
        }
        
        // ========== NUEVOS VALORES POR DEFECTO ==========
        if (estatusEpaLista.length === 0) {
            estatusEpaLista = ['PENDIENTE', 'AGENDADO', 'REALIZADO', 'NO APLICA'];
        }
        
        if (anestesiologosLista.length === 0) {
            anestesiologosLista = ['DR. DANILO NAVA', 'DR. PEDRO GOLES', 'DRA. MARIANGEL YANES', 'DRA. RAQUEL VALERO', 'DRA. MARINELA RICCOBONO', 'DR. ROBERTO OROZCO', 'DR. DANIEL RIQUELME', 'DR. ANGEL MONTIEL'];
        }
        
        if (comunasLista.length === 0) {
            comunasLista = ['ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA'];
        }
        // =================================================
        
        // Sincronizar con el objeto global especialistas
        Object.keys(medicosPorEspecialidad).forEach(esp => {
            especialistas[esp] = medicosPorEspecialidad[esp];
        });
        
        // Refrescar todos los selects
        refrescarTodosLosSelectsFiltros();
        
        // Si es admin, cargar datos en el panel
        if (currentUserRole === 'admin') {
            cargarDatosEnPanelAdmin();
        }
        
    } catch (error) {
        console.error("Error cargando configuración:", error);
    }
}

async function guardarConfiguracionFiltros() {
    if (currentUserRole !== 'admin') return;
    
    const dataToSave = {
        especialidades: especialidadesLista,
        medicosPorEspecialidad: medicosPorEspecialidad,
        estatusTabla: estatusTablaLista,
        estatusEpa: estatusEpaLista,
        anestesiologos: anestesiologosLista,
        comunas: comunasLista,
        ultimaModificacion: firebase.database.ServerValue.TIMESTAMP,
        modificadoPor: currentUser ? currentUser.email : 'Sistema'
    };
    
    await db.ref(CONFIG_DB_PATH).set(dataToSave);
}

// ====================== REFRESCAR TODOS LOS SELECTS ======================
function refrescarTodosLosSelectsFiltros() {
    // 1. Especialidad (formulario nuevo paciente)
    const especialidadSelect = document.getElementById('especialidad');
    if (especialidadSelect) {
        const valorActual = especialidadSelect.value;
        especialidadSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>';
        especialidadesLista.forEach(esp => {
            const option = document.createElement('option');
            option.value = esp;
            option.textContent = esp;
            especialidadSelect.appendChild(option);
        });
        if (valorActual && especialidadesLista.includes(valorActual)) {
            especialidadSelect.value = valorActual;
        }
    }
    
    // 2. Estatus Tabla (formulario nuevo paciente)
    const estatusSelect = document.getElementById('estatusTabla');
    if (estatusSelect) {
        const valorActual = estatusSelect.value;
        estatusSelect.innerHTML = '<option value="">Seleccionar Estatus</option>';
        estatusTablaLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            estatusSelect.appendChild(option);
        });
        if (valorActual && estatusTablaLista.includes(valorActual)) {
            estatusSelect.value = valorActual;
        }
    }
    
    // 3. Estatus EPA
    const estatusEpaSelect = document.getElementById('estatusEpa');
    if (estatusEpaSelect) {
        const valorActual = estatusEpaSelect.value;
        estatusEpaSelect.innerHTML = '<option value="">Seleccionar</option>';
        estatusEpaLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            estatusEpaSelect.appendChild(option);
        });
        if (valorActual && estatusEpaLista.includes(valorActual)) {
            estatusEpaSelect.value = valorActual;
        }
    }
    
    // 4. Anestesiólogo
    const anestesiologoSelect = document.getElementById('anestesiologo');
    if (anestesiologoSelect) {
        const valorActual = anestesiologoSelect.value;
        anestesiologoSelect.innerHTML = '<option value="">Seleccionar Anestesiólogo</option>';
        anestesiologosLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            anestesiologoSelect.appendChild(option);
        });
        if (valorActual && anestesiologosLista.includes(valorActual)) {
            anestesiologoSelect.value = valorActual;
        }
    }
    
    // 5. Comuna
    const comunaSelect = document.getElementById('comuna');
    if (comunaSelect) {
        const valorActual = comunaSelect.value;
        comunaSelect.innerHTML = '<option value="">Seleccionar Comuna</option>';
        comunasLista.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            comunaSelect.appendChild(option);
        });
        if (valorActual && comunasLista.includes(valorActual)) {
            comunaSelect.value = valorActual;
        }
    }
    
    // 6. Filtros de lista de pacientes
    cargarFiltrosLista();
}



// ====================== CARGAR DATOS EN EL PANEL ADMIN ======================
function cargarDatosEnPanelAdmin() {
    if (currentUserRole !== 'admin') return;
    
    // 1. Cargar especialidades en el select
    const adminEspSelect = document.getElementById('adminEspSelect');
    if (adminEspSelect) {
        adminEspSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>';
        especialidadesLista.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            adminEspSelect.appendChild(opt);
        });
    }
    
    // 2. Cargar médicos de la especialidad seleccionada
    adminCargarMedicos();
    
    // 3. Cargar Estatus Tabla
    const adminEstatusList = document.getElementById('adminEstatusList');
    if (adminEstatusList) {
        adminEstatusList.innerHTML = '';
        estatusTablaLista.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est;
            opt.textContent = est;
            adminEstatusList.appendChild(opt);
        });
    }
    
    // 4. Cargar Estatus EPA
    const adminEpaList = document.getElementById('adminEpaList');
    if (adminEpaList) {
        adminEpaList.innerHTML = '';
        estatusEpaLista.forEach(epa => {
            const opt = document.createElement('option');
            opt.value = epa;
            opt.textContent = epa;
            adminEpaList.appendChild(opt);
        });
    }
    
    // 5. Cargar Anestesiólogos
    const adminAnestList = document.getElementById('adminAnestesiologosList');
    if (adminAnestList) {
        adminAnestList.innerHTML = '';
        anestesiologosLista.forEach(anest => {
            const opt = document.createElement('option');
            opt.value = anest;
            opt.textContent = anest;
            adminAnestList.appendChild(opt);
        });
    }
    
    // 6. Cargar Comunas
    const adminComunasList = document.getElementById('adminComunasList');
    if (adminComunasList) {
        adminComunasList.innerHTML = '';
        comunasLista.forEach(comuna => {
            const opt = document.createElement('option');
            opt.value = comuna;
            opt.textContent = comuna;
            adminComunasList.appendChild(opt);
        });
    }
}
function adminCargarMedicos() {
    const esp = document.getElementById('adminEspSelect').value;
    const adminMedicosList = document.getElementById('adminMedicosList');
    if (!adminMedicosList) return;
    
    if (!esp) {
        adminMedicosList.innerHTML = '<option value="">-- Selecciona una especialidad primero --</option>';
        return;
    }
    
    adminMedicosList.innerHTML = '';
    const medicos = medicosPorEspecialidad[esp] || [];
    
    if (medicos.length === 0) {
        adminMedicosList.innerHTML = '<option value="">-- No hay médicos registrados --</option>';
    } else {
        medicos.forEach(med => {
            const opt = document.createElement('option');
            opt.value = med;
            opt.textContent = med;
            adminMedicosList.appendChild(opt);
        });
    }
}

async function adminAgregarEspecialidad() {
    const nuevaEsp = document.getElementById('adminNuevaEspecialidad').value.trim().toUpperCase();
    if (!nuevaEsp) { alert("Ingresa el nombre de la especialidad"); return; }
    if (especialidadesLista.includes(nuevaEsp)) { alert("Esta especialidad ya existe"); return; }
    
    especialidadesLista.push(nuevaEsp);
    especialidadesLista.sort();
    medicosPorEspecialidad[nuevaEsp] = [];
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    document.getElementById('adminNuevaEspecialidad').value = '';
    alert(`✅ Especialidad "${nuevaEsp}" agregada correctamente`);
}

async function adminAgregarMedico() {
    const esp = document.getElementById('adminEspSelect').value;
    const nuevoMedico = document.getElementById('adminNuevoMedico').value.trim().toUpperCase();
    
    if (!esp) { alert("Selecciona una especialidad primero"); return; }
    if (!nuevoMedico) { alert("Ingresa el nombre del médico"); return; }
    
    if (!medicosPorEspecialidad[esp]) medicosPorEspecialidad[esp] = [];
    if (medicosPorEspecialidad[esp].includes(nuevoMedico)) {
        alert("Este médico ya existe en esta especialidad");
        return;
    }
    
    medicosPorEspecialidad[esp].push(nuevoMedico);
    medicosPorEspecialidad[esp].sort();
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    adminCargarMedicos();
    document.getElementById('adminNuevoMedico').value = '';
    alert(`✅ Médico "${nuevoMedico}" agregado a ${esp}`);
}

async function adminEliminarMedico() {
    const esp = document.getElementById('adminEspSelect').value;
    const adminMedicosList = document.getElementById('adminMedicosList');
    const medicoSeleccionado = adminMedicosList?.value;
    
    if (!esp || !medicoSeleccionado) { alert("Selecciona un médico para eliminar"); return; }
    if (!confirm(`¿Eliminar al médico "${medicoSeleccionado}" de ${esp}?`)) return;
    
    const index = medicosPorEspecialidad[esp].indexOf(medicoSeleccionado);
    if (index !== -1) medicosPorEspecialidad[esp].splice(index, 1);
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    adminCargarMedicos();
    alert(`✅ Médico "${medicoSeleccionado}" eliminado`);
}

async function adminAgregarEstatus() {
    const nuevoEstatus = document.getElementById('adminNuevoEstatus').value.trim().toUpperCase();
    if (!nuevoEstatus) { alert("Ingresa un nuevo estatus"); return; }
    if (estatusTablaLista.includes(nuevoEstatus)) { alert("Este estatus ya existe"); return; }
    
    estatusTablaLista.push(nuevoEstatus);
    estatusTablaLista.sort();
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoEstatus').value = '';
    alert(`✅ Estatus "${nuevoEstatus}" agregado correctamente`);
}

async function adminEliminarEstatus() {
    const adminEstatusList = document.getElementById('adminEstatusList');
    const estatusSeleccionado = adminEstatusList?.value;
    
    if (!estatusSeleccionado) { alert("Selecciona un estatus para eliminar"); return; }
    if (!confirm(`¿Eliminar el estatus "${estatusSeleccionado}"?`)) return;
    
    const index = estatusTablaLista.indexOf(estatusSeleccionado);
    if (index !== -1) estatusTablaLista.splice(index, 1);
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    alert(`✅ Estatus "${estatusSeleccionado}" eliminado`);
}

async function adminRestablecerDefault() {
    if (!confirm("⚠️ ¿Restablecer todos los valores por defecto?\nEsto eliminará todas las especialidades, médicos, estatus, anestesiólogos y comunas que hayas agregado.")) return;
    
    especialidadesLista = Object.keys(especialistas);
    medicosPorEspecialidad = JSON.parse(JSON.stringify(especialistas));
    estatusTablaLista = ['PROGRAMABLE','PENDIENTE EPA','NO PROGRAMABLE','ACTUALIZAR','CARTA CERTIFICADA','OPERADO','EGRESO','TRASLADO INTERNO','RECHAZO','EXCEPTUADO TRANSITORIO','EXCEPTUADO POR RECHAZO','EXCEPTUADO INUBICABLE'];
    estatusEpaLista = ['PENDIENTE', 'AGENDADO', 'REALIZADO', 'NO APLICA'];
    anestesiologosLista = ['DR. DANILO NAVA', 'DR. PEDRO GOLES', 'DRA. MARIANGEL YANES', 'DRA. RAQUEL VALERO', 'DRA. MARINELA RICCOBONO', 'DR. ROBERTO OROZCO', 'DR. DANIEL RIQUELME', 'DR. ANGEL MONTIEL'];
    comunasLista = ['ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA'];
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    alert("✅ Valores restablecidos a los originales");
}

// ====================== EVENTOS DEL PANEL ADMIN ======================
document.getElementById('adminEspSelect')?.addEventListener('change', function() {
    adminCargarMedicos();
});

// ====================== FUNCIONES DE MEDIANA ======================
function calcularMediana(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    } else {
        return sorted[mid];
    }
}

// ====================== TABLA DE MEDIANAS POR ESPECIALIDAD ======================
function renderMedianasPorEspecialidad(pacientesFiltrados) {
    const tbody = document.getElementById('medianasTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const especialidades = [...new Set(pacientesFiltrados.map(p => p.especialidad).filter(e => e))];
    especialidades.sort();
    
    especialidades.forEach(esp => {
        const pacientesEsp = pacientesFiltrados.filter(p => p.especialidad === esp);
        // Usar fuentePercentilDashboard para la mediana de espera
        const tiemposEsp = pacientesEsp.map(p => {
            if (fuentePercentilDashboard === 'fechaEstatusProgram') {
                return calculateWaitingDays(p.fechaEstatusProgram);
            } else {
                return calculateWaitingDays(p.fechaIndQx);
            }
        }).filter(t => t > 0);
        const tiemposProgramEsp = pacientesEsp.map(p => calculateWaitingDays(p.fechaEstatusProgram)).filter(t => t > 0);
        
        const medianaEsp = calcularMediana(tiemposEsp);
        const medianaProgramEsp = calcularMediana(tiemposProgramEsp);
        const total = pacientesEsp.length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${esp}</strong></td>
            <td>${medianaEsp} días</span></strong></span></span></strong></span></span></span></span></span></td>
            <td>${medianaProgramEsp} días</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${total}</span></strong></span></span></span></strong></span></span></span></span></span></td>
        `;
        tbody.appendChild(row);
    });
}

// ====================== TOP PACIENTES CON MAYOR ESPERA ======================
function renderTopEspera(pacientesFiltrados) {
    const tbody = document.getElementById('topEsperaBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const top10 = [...pacientesFiltrados]
        .sort((a, b) => {
            const diasA = fuentePercentilDashboard === 'fechaEstatusProgram' 
                ? calculateWaitingDays(a.fechaEstatusProgram) 
                : calculateWaitingDays(a.fechaIndQx);
            const diasB = fuentePercentilDashboard === 'fechaEstatusProgram' 
                ? calculateWaitingDays(b.fechaEstatusProgram) 
                : calculateWaitingDays(b.fechaIndQx);
            return diasB - diasA;
        })
        .slice(0, 10);
    
    top10.forEach(p => {
        const diasEspera = fuentePercentilDashboard === 'fechaEstatusProgram' 
            ? calculateWaitingDays(p.fechaEstatusProgram) 
            : calculateWaitingDays(p.fechaIndQx);
            
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.nombreApellido || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.rut || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.especialidad || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td><strong style="color: #ef4444;">${diasEspera} días</strong></span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.prioridad || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td><button onclick="showPatientModal('${p.firebaseKey}')" class="btn-secondary" style="padding: 4px 12px;">Ver</button></span></strong></span></span></span></strong></span></span></span></span></span></td>
        `;
        tbody.appendChild(row);
    });
}

// ====================== ÚLTIMOS PACIENTES REGISTRADOS ======================
function renderUltimosPacientes(pacientesFiltrados) {
    const tbody = document.getElementById('ultimosPacientesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const ultimos5 = [...pacientesFiltrados]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);
    
    ultimos5.forEach(p => {
        const fechaRegistro = p.timestamp ? new Date(p.timestamp).toLocaleDateString('es-CL') : '-';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fechaRegistro}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.nombreApellido || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.rut || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.especialidad || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.estatusTabla || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            <td>${p.intervencion || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
        `;
        tbody.appendChild(row);
    });
}

// ====================== GRÁFICO DE TENDENCIA MENSUAL ======================
function renderTendenciaMensual(pacientesFiltrados) {
    const ctx = document.getElementById('tendenciaChart');
    if (!ctx) return;
    if (tendenciaChartInstance) tendenciaChartInstance.destroy();
    
    const meses = {};
    pacientesFiltrados.forEach(p => {
        if (p.fechaIndQx) {
            const fecha = new Date(p.fechaIndQx);
            const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            meses[mesKey] = (meses[mesKey] || 0) + 1;
        }
    });
    
    const labels = Object.keys(meses).sort();
    const datos = labels.map(l => meses[l]);
    
    tendenciaChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pacientes ingresados',
                data: datos,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#1e40af',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw} pacientes` } }
            }
        }
    });
}

// ====================== FILTRO DEL DASHBOARD ======================
function actualizarDashboardConFiltro() {
    const select = document.getElementById('dashboardFilterEspecialidad');
    dashboardFiltroEspecialidad = select.value;
    updateDashboard();
}

function limpiarFiltroDashboard() {
    document.getElementById('dashboardFilterEspecialidad').value = '';
    dashboardFiltroEspecialidad = '';
    updateDashboard();
}

function cargarEspecialidadesEnFiltroDashboard() {
    const select = document.getElementById('dashboardFilterEspecialidad');
    if (!select) return;
    const especialidades = [...new Set(patients.map(p => p.especialidad).filter(e => e))];
    especialidades.sort();
    select.innerHTML = '<option value="">Todas las Especialidades</option>';
    especialidades.forEach(esp => {
        const opt = document.createElement('option');
        opt.value = esp;
        opt.textContent = esp;
        select.appendChild(opt);
    });
}

// ====================== CREAR USUARIO POR ADMIN ======================
// ====================== CREAR NUEVO USUARIO (SOLO ADMIN) ======================
let isCreatingUser = false;   // ← Protección contra doble clic

async function crearUsuarioPorAdmin() {
    // Verificar permisos
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos para realizar esta acción.");
        return;
    }

    // === BLOQUEO CONTRA DOBLE CLIC ===
    if (isCreatingUser) {
        console.log("Creación de usuario ya en progreso...");
        return;
    }
    isCreatingUser = true;

    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    // Validaciones
    if (!email) {
        alert("❌ Ingresa un correo electrónico");
        isCreatingUser = false;
        return;
    }
    
    if (!password || password.length < 6) {
        alert("❌ La contraseña debe tener mínimo 6 caracteres");
        isCreatingUser = false;
        return;
    }
    
    if (!confirm(`¿Crear usuario con los siguientes datos?\n\n📧 Email: ${email}\n🔒 Rol: ${role === 'admin' ? 'Administrador' : 'Usuario'}`)) {
        isCreatingUser = false;
        return;
    }
    
    // Mostrar loading
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        // 1. Crear usuario en Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Guardar datos adicionales en Realtime Database
        await db.ref('users/' + user.uid).set({
            email: user.email,
            role: role,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: null,
            createdBy: currentUser.email,
            createdByUid: currentUser.uid
        });
        
        // 3. Limpiar formulario
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPassword').value = '';
        document.getElementById('newUserRole').value = 'user';
        
        // 4. Recargar lista de usuarios
        if (typeof loadUsers === 'function') {
            await loadUsers();
        }
        
        alert(`✅ Usuario creado exitosamente:\n\n📧 ${email}\n🔒 Rol: ${role === 'admin' ? 'Administrador' : 'Usuario'}`);
        
    } catch (error) {
        console.error("Error al crear usuario:", error);
        
        if (error.code === 'auth/email-already-in-use') {
            alert("❌ Este correo electrónico ya está registrado.");
        } else if (error.code === 'auth/invalid-email') {
            alert("❌ El correo electrónico no es válido.");
        } else if (error.code === 'auth/weak-password') {
            alert("❌ La contraseña es muy débil. Usa al menos 6 caracteres.");
        } else {
            alert("❌ Error al crear usuario: " + error.message);
        }
    } finally {
        isCreatingUser = false;
        if (loading) loading.style.display = 'none';
    }
}

// ====================== ENVIAR CORREO DE RESTABLECIMIENTO ======================
async function enviarCorreoRestablecimiento(email) {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos.");
        return;
    }
    
    if (!confirm(`¿Enviar correo de restablecimiento de contraseña a:\n\n${email}?`)) return;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert(`✅ Correo de restablecimiento enviado a:\n${email}\n\nEl usuario podrá establecer su nueva contraseña.`);
    } catch (error) {
        console.error(error);
        alert("❌ Error al enviar correo: " + error.message);
    }
}




// ====================== GESTIÓN DE ESTATUS EPA ======================
async function adminAgregarEpa() {
    const nuevoEpa = document.getElementById('adminNuevoEpa').value.trim().toUpperCase();
    if (!nuevoEpa) { alert("Ingresa un nuevo estatus EPA"); return; }
    if (estatusEpaLista.includes(nuevoEpa)) { alert("Este estatus EPA ya existe"); return; }
    
    estatusEpaLista.push(nuevoEpa);
    estatusEpaLista.sort();
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoEpa').value = '';
    alert(`✅ Estatus EPA "${nuevoEpa}" agregado`);
}

async function adminEliminarEpa() {
    const adminEpaList = document.getElementById('adminEpaList');
    const epaSeleccionado = adminEpaList?.value;
    
    if (!epaSeleccionado) { alert("Selecciona un estatus EPA para eliminar"); return; }
    if (!confirm(`¿Eliminar "${epaSeleccionado}"?`)) return;
    
    const index = estatusEpaLista.indexOf(epaSeleccionado);
    if (index !== -1) estatusEpaLista.splice(index, 1);
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    alert(`✅ Estatus EPA "${epaSeleccionado}" eliminado`);
}

// ====================== GESTIÓN DE ANESTESIÓLOGOS ======================
async function adminAgregarAnestesiologo() {
    const nuevoAnest = document.getElementById('adminNuevoAnestesiologo').value.trim().toUpperCase();
    if (!nuevoAnest) { alert("Ingresa un nuevo anestesiólogo"); return; }
    if (anestesiologosLista.includes(nuevoAnest)) { alert("Este anestesiólogo ya existe"); return; }
    
    anestesiologosLista.push(nuevoAnest);
    anestesiologosLista.sort();
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoAnestesiologo').value = '';
    alert(`✅ Anestesiólogo "${nuevoAnest}" agregado`);
}

async function adminEliminarAnestesiologo() {
    const adminAnestList = document.getElementById('adminAnestesiologosList');
    const anestSeleccionado = adminAnestList?.value;
    
    if (!anestSeleccionado) { alert("Selecciona un anestesiólogo para eliminar"); return; }
    if (!confirm(`¿Eliminar "${anestSeleccionado}"?`)) return;
    
    const index = anestesiologosLista.indexOf(anestSeleccionado);
    if (index !== -1) anestesiologosLista.splice(index, 1);
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    alert(`✅ Anestesiólogo "${anestSeleccionado}" eliminado`);
}

// ====================== GESTIÓN DE COMUNAS ======================
async function adminAgregarComuna() {
    const nuevaComuna = document.getElementById('adminNuevaComuna').value.trim().toUpperCase();
    if (!nuevaComuna) { alert("Ingresa una nueva comuna"); return; }
    if (comunasLista.includes(nuevaComuna)) { alert("Esta comuna ya existe"); return; }
    
    comunasLista.push(nuevaComuna);
    comunasLista.sort();
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    document.getElementById('adminNuevaComuna').value = '';
    alert(`✅ Comuna "${nuevaComuna}" agregada`);
}

async function adminEliminarComuna() {
    const adminComunasList = document.getElementById('adminComunasList');
    const comunaSeleccionada = adminComunasList?.value;
    
    if (!comunaSeleccionada) { alert("Selecciona una comuna para eliminar"); return; }
    if (!confirm(`¿Eliminar "${comunaSeleccionada}"?`)) return;
    
    const index = comunasLista.indexOf(comunaSeleccionada);
    if (index !== -1) comunasLista.splice(index, 1);
    
    await guardarConfiguracionFiltros();
    refrescarTodosLosSelectsFiltros();
    cargarDatosEnPanelAdmin();
    alert(`✅ Comuna "${comunaSeleccionada}" eliminada`);
}


// ====================== IMPRIMIR LISTA DE PACIENTES FILTRADA ======================
function printPatientList() {
    // Obtener los pacientes filtrados actualmente usando la misma función que CSV/Excel
    const filtered = getCurrentFilteredData();  // ✅ AHORA USA LA MISMA FUNCIÓN
    
    if (filtered.length === 0) {
        alert("❌ No hay pacientes en la lista actual. Revisa los filtros aplicados.");
        return;
    }

    // Ordenar por T. Espera (ascendente)
    filtered.sort((a, b) => calculateWaitingDays(a.fechaIndQx) - calculateWaitingDays(b.fechaIndQx));

    // Generar HTML para impresión
    const printWindow = window.open('', '_blank');
    
    // Obtener texto de filtros para mostrar
    const textoFiltros = obtenerTextoFiltros();
    
    let tablaHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Lista de Pacientes - Unidad Prequirúrgica</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Roboto', Arial, sans-serif;
                    margin: 20px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #1e2937;
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 3px solid #1e40af;
                    padding-bottom: 15px;
                }
                .logo {
                    height: 70px;
                }
                h1 {
                    font-size: 18px;
                    margin: 5px 0;
                    color: #1e40af;
                }
                h2 {
                    font-size: 14px;
                    margin: 3px 0;
                    color: #334155;
                }
                .filters-info {
                    background: #f8fafc;
                    padding: 10px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    font-size: 11px;
                    border: 1px solid #e2e8f0;
                }
                .filters-info p {
                    margin: 3px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #94a3b8;
                    padding: 8px 6px;
                    text-align: left;
                    vertical-align: top;
                }
                th {
                    background: #1e40af;
                    color: white;
                    font-weight: 600;
                    font-size: 11px;
                }
                td {
                    font-size: 10px;
                }
                tr:nth-child(even) {
                    background: #f8fafc;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 10px;
                    color: #64748b;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 10px;
                }
                .total-registros {
                    margin-top: 15px;
                    font-weight: bold;
                    text-align: right;
                    font-size: 11px;
                }
                @media print {
                    body {
                        margin: 10px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" alt="Hospital Illapel" class="logo" onerror="this.style.display='none'">
                <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                <h2>LISTA DE PACIENTES</h2>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>
            
            <div class="filters-info">
                <p><strong>📋 Filtros aplicados:</strong> ${textoFiltros}</p>
                <p>✅ Total de registros encontrados: <strong>${filtered.length}</strong></p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha Ind. Qx</th>
                        <th>T. Espera</th>
                        <th>Nombre y Apellido</th>
                        <th>RUT</th>
                        <th>Diagnóstico</th>
                        <th>Estatus Tabla</th>
                        <th>Especialidad</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Agregar filas de pacientes
    filtered.forEach(patient => {
        const diasEspera = calculateWaitingDays(patient.fechaIndQx);
        tablaHTML += `
            <tr>
                <td>${patient.id || '-'}</td>
                <td>${patient.fechaIndQx ? formatDate(patient.fechaIndQx) : '-'}</td>
                <td><strong>${diasEspera}</strong></td>
                <td>${patient.nombreApellido || '-'}</td>
                <td>${patient.rut || '-'}</td>
                <td>${(patient.diagnostico || '-').substring(0, 50)}${(patient.diagnostico || '').length > 50 ? '...' : ''}</td>
                <td>${patient.estatusTabla || '-'}</td>
                <td>${patient.especialidad || '-'}</td>
            </tr>
        `;
    });

    tablaHTML += `
                </tbody>
            </table>
            
            <div class="total-registros">
                Total de pacientes: ${filtered.length}
            </div>
            
            <div class="footer">
                Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(tablaHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// ====================== ELIMINAR REGISTRO DEL HISTORIAL (SOLO ADMIN) ======================
async function eliminarRegistroHistorial(patientKey, historialKey) {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos para eliminar registros del historial.");
        return;
    }
    
    if (!confirm("⚠️ ¿Estás seguro de eliminar este registro del historial?\n\nEsta acción es irreversible.")) {
        return;
    }

    guardarFiltrosEnStorage(); // Guardar filtros antes de modificar

    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';

    try {
        await db.ref(`patients/${patientKey}/historial/${historialKey}`).remove();
        
        alert("✅ Registro del historial eliminado correctamente.");
        
        await loadPatients();
        restaurarFiltros();           // Restaurar filtros del usuario
        showPatientModal(patientKey); // Recargar modal
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ====================== ACTUALIZAR CAMPO EN TODOS LOS PACIENTES ======================
async function actualizarCampoEnPacientes(campo, valorAntiguo, valorNuevo) {
    if (valorAntiguo === valorNuevo) return false;
    
    let actualizados = 0;
    const snapshot = await db.ref('patients').once('value');
    
    const updates = {};
    snapshot.forEach((child) => {
        const patient = child.val();
        const key = child.key;
        
        if (patient[campo] === valorAntiguo) {
            updates[`patients/${key}/${campo}`] = valorNuevo;
            actualizados++;
        }
    });
    
    if (actualizados > 0) {
        await db.ref().update(updates);
    }
    
    return actualizados;
}



async function adminEditarEspecialidad() {
    const selectEsp = document.getElementById('adminEspSelect');
    const espAntigua = selectEsp.value;
    const espNueva = document.getElementById('adminNuevaEspecialidad').value.trim().toUpperCase();
    
    if (!espAntigua) {
        alert("❌ Selecciona una especialidad para editar");
        return;
    }
    if (!espNueva) {
        alert("❌ Ingresa el nuevo nombre de la especialidad");
        return;
    }
    if (espAntigua === espNueva) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (especialidadesLista.includes(espNueva)) {
        alert("❌ Ya existe una especialidad con ese nombre");
        return;
    }
    
    if (!confirm(`¿Cambiar especialidad "${espAntigua}" → "${espNueva}"?\n\nEsto actualizará TODOS los pacientes que tengan esta especialidad.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        // 1. Actualizar en todos los pacientes
        const actualizados = await actualizarCampoEnPacientes('especialidad', espAntigua, espNueva);
        
        // 2. Actualizar en listas dinámicas
        const index = especialidadesLista.indexOf(espAntigua);
        if (index !== -1) especialidadesLista[index] = espNueva;
        especialidadesLista.sort();
        
        // 3. Actualizar médicos asociados
        if (medicosPorEspecialidad[espNueva]) {
            medicosPorEspecialidad[espNueva] = medicosPorEspecialidad[espAntigua];
        } else {
            medicosPorEspecialidad[espNueva] = medicosPorEspecialidad[espAntigua] || [];
        }
        delete medicosPorEspecialidad[espAntigua];
        
        // 4. Guardar configuración
        await guardarConfiguracionFiltros();
        
        // 5. Refrescar toda la interfaz
        refrescarTodosLosSelectsFiltros();
        cargarDatosEnPanelAdmin();
        
        alert(`✅ Especialidad actualizada\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevaEspecialidad').value = '';
    }
}


async function adminEditarMedico() {
    const esp = document.getElementById('adminEspSelect').value;
    const selectMedicos = document.getElementById('adminMedicosList');
    const medicoAntiguo = selectMedicos.value;
    const medicoNuevo = document.getElementById('adminNuevoMedico').value.trim().toUpperCase();
    
    if (!esp) {
        alert("❌ Selecciona una especialidad primero");
        return;
    }
    if (!medicoAntiguo) {
        alert("❌ Selecciona un médico para editar");
        return;
    }
    if (!medicoNuevo) {
        alert("❌ Ingresa el nuevo nombre del médico");
        return;
    }
    if (medicoAntiguo === medicoNuevo) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (medicosPorEspecialidad[esp].includes(medicoNuevo)) {
        alert("❌ Ya existe un médico con ese nombre en esta especialidad");
        return;
    }
    
    if (!confirm(`¿Cambiar médico "${medicoAntiguo}" → "${medicoNuevo}"?\n\nEsto actualizará TODOS los pacientes que tengan este médico.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        // 1. Actualizar en todos los pacientes
        const actualizados = await actualizarCampoEnPacientes('medicoTratante', medicoAntiguo, medicoNuevo);
        
        // 2. Actualizar en lista de médicos
        const index = medicosPorEspecialidad[esp].indexOf(medicoAntiguo);
        if (index !== -1) medicosPorEspecialidad[esp][index] = medicoNuevo;
        medicosPorEspecialidad[esp].sort();
        
        // 3. Guardar configuración
        await guardarConfiguracionFiltros();
        
        // 4. Refrescar
        refrescarTodosLosSelectsFiltros();
        adminCargarMedicos();
        
        alert(`✅ Médico actualizado\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevoMedico').value = '';
    }
}


async function adminEditarEstatus() {
    const selectEstatus = document.getElementById('adminEstatusList');
    const estatusAntiguo = selectEstatus.value;
    const estatusNuevo = document.getElementById('adminNuevoEstatus').value.trim().toUpperCase();
    
    if (!estatusAntiguo) {
        alert("❌ Selecciona un estatus para editar");
        return;
    }
    if (!estatusNuevo) {
        alert("❌ Ingresa el nuevo nombre del estatus");
        return;
    }
    if (estatusAntiguo === estatusNuevo) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (estatusTablaLista.includes(estatusNuevo)) {
        alert("❌ Ya existe un estatus con ese nombre");
        return;
    }
    
    if (!confirm(`¿Cambiar estatus "${estatusAntiguo}" → "${estatusNuevo}"?\n\nEsto actualizará TODOS los pacientes con este estatus.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        // Actualizar en todos los pacientes
        const actualizados = await actualizarCampoEnPacientes('estatusTabla', estatusAntiguo, estatusNuevo);
        
        // Actualizar en lista
        const index = estatusTablaLista.indexOf(estatusAntiguo);
        if (index !== -1) estatusTablaLista[index] = estatusNuevo;
        estatusTablaLista.sort();
        
        await guardarConfiguracionFiltros();
        refrescarTodosLosSelectsFiltros();
        cargarDatosEnPanelAdmin();
        
        alert(`✅ Estatus actualizado\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevoEstatus').value = '';
    }
}



async function adminEditarEpa() {
    const selectEpa = document.getElementById('adminEpaList');
    const epaAntiguo = selectEpa.value;
    const epaNuevo = document.getElementById('adminNuevoEpa').value.trim().toUpperCase();
    
    if (!epaAntiguo) {
        alert("❌ Selecciona un estatus EPA para editar");
        return;
    }
    if (!epaNuevo) {
        alert("❌ Ingresa el nuevo nombre del estatus EPA");
        return;
    }
    if (epaAntiguo === epaNuevo) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (estatusEpaLista.includes(epaNuevo)) {
        alert("❌ Ya existe un estatus EPA con ese nombre");
        return;
    }
    
    if (!confirm(`¿Cambiar estatus EPA "${epaAntiguo}" → "${epaNuevo}"?\n\nEsto actualizará TODOS los pacientes con este estatus EPA.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        const actualizados = await actualizarCampoEnPacientes('estatusEpa', epaAntiguo, epaNuevo);
        
        const index = estatusEpaLista.indexOf(epaAntiguo);
        if (index !== -1) estatusEpaLista[index] = epaNuevo;
        estatusEpaLista.sort();
        
        await guardarConfiguracionFiltros();
        refrescarTodosLosSelectsFiltros();
        cargarDatosEnPanelAdmin();
        
        alert(`✅ Estatus EPA actualizado\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevoEpa').value = '';
    }
}



async function adminEditarAnestesiologo() {
    const selectAnest = document.getElementById('adminAnestesiologosList');
    const anestAntiguo = selectAnest.value;
    const anestNuevo = document.getElementById('adminNuevoAnestesiologo').value.trim().toUpperCase();
    
    if (!anestAntiguo) {
        alert("❌ Selecciona un anestesiólogo para editar");
        return;
    }
    if (!anestNuevo) {
        alert("❌ Ingresa el nuevo nombre del anestesiólogo");
        return;
    }
    if (anestAntiguo === anestNuevo) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (anestesiologosLista.includes(anestNuevo)) {
        alert("❌ Ya existe un anestesiólogo con ese nombre");
        return;
    }
    
    if (!confirm(`¿Cambiar anestesiólogo "${anestAntiguo}" → "${anestNuevo}"?\n\nEsto actualizará TODOS los pacientes con este anestesiólogo.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        const actualizados = await actualizarCampoEnPacientes('anestesiologo', anestAntiguo, anestNuevo);
        
        const index = anestesiologosLista.indexOf(anestAntiguo);
        if (index !== -1) anestesiologosLista[index] = anestNuevo;
        anestesiologosLista.sort();
        
        await guardarConfiguracionFiltros();
        refrescarTodosLosSelectsFiltros();
        cargarDatosEnPanelAdmin();
        
        alert(`✅ Anestesiólogo actualizado\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevoAnestesiologo').value = '';
    }
}


async function adminEditarComuna() {
    const selectComuna = document.getElementById('adminComunasList');
    const comunaAntigua = selectComuna.value;
    const comunaNueva = document.getElementById('adminNuevaComuna').value.trim().toUpperCase();
    
    if (!comunaAntigua) {
        alert("❌ Selecciona una comuna para editar");
        return;
    }
    if (!comunaNueva) {
        alert("❌ Ingresa el nuevo nombre de la comuna");
        return;
    }
    if (comunaAntigua === comunaNueva) {
        alert("⚠️ El nombre es el mismo. No se realizaron cambios.");
        return;
    }
    if (comunasLista.includes(comunaNueva)) {
        alert("❌ Ya existe una comuna con ese nombre");
        return;
    }
    
    if (!confirm(`¿Cambiar comuna "${comunaAntigua}" → "${comunaNueva}"?\n\nEsto actualizará TODOS los pacientes con esta comuna.`)) {
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        const actualizados = await actualizarCampoEnPacientes('comuna', comunaAntigua, comunaNueva);
        
        const index = comunasLista.indexOf(comunaAntigua);
        if (index !== -1) comunasLista[index] = comunaNueva;
        comunasLista.sort();
        
        await guardarConfiguracionFiltros();
        refrescarTodosLosSelectsFiltros();
        cargarDatosEnPanelAdmin();
        
        alert(`✅ Comuna actualizada\n📊 Pacientes afectados: ${actualizados}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
        document.getElementById('adminNuevaComuna').value = '';
    }
}

// ====================== FUNCIONES DE GESTIÓN DE LLAMADAS ======================

// Actualizar tabla de llamados pendientes en el dashboard
function actualizarTablaLlamadosPendientes() {
    const tbody = document.getElementById('llamadosPendientesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Calcular fecha límite (hoy + 10 días)
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + 10);
    fechaLimite.setHours(0, 0, 0, 0);
    
    // Filtrar pacientes con fechaProximoLlamado <= fechaLimite
    const pendientes = patients.filter(p => {
        if (!p.fechaProximoLlamado) return false;
        const fechaLlamado = new Date(p.fechaProximoLlamado);
        fechaLlamado.setHours(0, 0, 0, 0);
        return fechaLlamado <= fechaLimite;
    });
    
    // Ordenar por fecha de próximo llamado (más cercano primero)
    pendientes.sort((a, b) => new Date(a.fechaProximoLlamado) - new Date(b.fechaProximoLlamado));
    
    if (pendientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay pacientes pendientes de llamado en los próximos 10 días</td><tr>';
        return;
    }
    
    pendientes.forEach(patient => {
        const fechaProgramada = new Date(patient.fechaProximoLlamado);
        const diasDiferencia = Math.ceil((fechaProgramada - hoy) / (1000 * 60 * 60 * 24));
        
        let estadoTexto = '';
        let estadoColor = '';
        let bgColor = '';
        
        if (diasDiferencia < 0) {
            estadoTexto = `${Math.abs(diasDiferencia)} días atrasado`;
            estadoColor = '#dc2626';
            bgColor = '#fee2e2';
        } else if (diasDiferencia === 0) {
            estadoTexto = 'Hoy';
            estadoColor = '#d97706';
            bgColor = '#fef3c7';
        } else {
            estadoTexto = `En ${diasDiferencia} días`;
            estadoColor = '#059669';
            bgColor = '#ecfdf5';
        }
        
        // Obtener última observación del historial de llamadas
        let ultimaObservacion = '-';
        if (patient.historialLlamadas) {
            const llamadasArray = Object.values(patient.historialLlamadas)
                .sort((a, b) => new Date(b.fechaLlamada) - new Date(a.fechaLlamada));
            if (llamadasArray.length > 0 && llamadasArray[0].observaciones) {
                ultimaObservacion = llamadasArray[0].observaciones.substring(0, 50);
                if (llamadasArray[0].observaciones.length > 50) ultimaObservacion += '...';
            }
        }
        
        const tr = document.createElement('tr');
        tr.style.backgroundColor = bgColor;
        tr.innerHTML = `
            <td><strong>${patient.nombreApellido || '-'}</strong></td>
            <td>${patient.rut || '-'}</td>
            <td>${patient.nContacto || '-'}</td>
            <td>${patient.especialidad || '-'}</td>
            <td><strong>${formatDate(patient.fechaProximoLlamado)}</strong></td>
            <td><strong style="color: ${estadoColor};">${estadoTexto}</strong></td>
            <td><small>${ultimaObservacion}</small></td>
            <td>
                <button onclick="abrirModalRegistroLlamada('${patient.firebaseKey}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">
                    📞 Registrar Llamada
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// Abrir modal para registrar llamada
function abrirModalRegistroLlamada(patientKey) {
    const patient = patients.find(p => p.firebaseKey === patientKey);
    if (!patient) return;
    
    currentModalPatient = patient;
    
    // Crear modal si no existe
    let modal = document.getElementById('modalRegistroLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRegistroLlamada';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <span class="close" onclick="cerrarModalRegistroLlamada()">&times;</span>
                <h2 style="color:#1e40af; margin-bottom:20px;">📞 Registro de Llamada</h2>
                
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <p><strong>Paciente:</strong> <span id="llamadaPacienteNombre"></span></p>
                    <p><strong>RUT:</strong> <span id="llamadaPacienteRut"></span></p>
                    <p><strong>Teléfono:</strong> <span id="llamadaPacienteContacto"></span></p>
                    <hr style="margin:10px 0;">
                    <p><strong>📝 Observaciones Generales:</strong><br>
                    <span id="llamadaPacienteObservaciones" style="font-size:13px; color:#475569;"></span></p>
                    <p><strong>💉 Indicaciones Anestesiólogo:</strong><br>
                    <span id="llamadaPacienteIndicaciones" style="font-size:13px; color:#475569;"></span></p>
                </div>
                
                <div class="form-group">
                    <label>📅 Fecha y Hora de la Llamada</label>
                    <input type="datetime-local" id="llamadaFechaHora" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>👤 Nombre del Receptor</label>
                    <input type="text" id="llamadaNombreRec" placeholder="Nombre y Apellido" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>🆔 RUT del Receptor</label>
                    <input type="text" id="llamadaRutRec" placeholder="Sin puntos con guión" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>👨‍👩‍👧 Parentesco con el Paciente</label>
                    <input type="text" id="llamadaParentesco" placeholder="Ej: Madre, Padre, Hermano, etc." style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>📋 Motivo de la Llamada</label>
                    <select id="llamadaMotivo" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="HORA DE EXAMENES">HORA DE EXAMENES</option>
                        <option value="HORA DE ANESTESIA">HORA DE ANESTESIA</option>
                        <option value="ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO">ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO</option>
                        <option value="FECHA CIRUGIA">FECHA CIRUGIA</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📝 Respuesta del Paciente/Receptor</label>
                    <select id="llamadaRespuesta" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="ACEPTA">ACEPTA</option>
                        <option value="RECHAZA">RECHAZA</option>
                        <option value="POSTERGA">POSTERGA</option>
                        <option value="NO RESPONDE LLAMADA">NO RESPONDE LLAMADA</option>
                        <option value="ENTREGARA INFORMACION">ENTREGARA INFORMACION</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📝 Observaciones de la Llamada</label>
                    <textarea id="llamadaObservaciones" rows="3" style="width:100%; padding:10px;" placeholder="Detalles específicos de la conversación..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>📅 Programar Próximo Llamado</label>
                    <input type="date" id="llamadaProximoLlamado" style="width:100%; padding:10px;">
                    <small style="color:#64748b;">Si se programa una fecha, aparecerá en la lista de pendientes</small>
                </div>
                
                <div class="modal-buttons" style="margin-top:20px;">
                    <button onclick="guardarRegistroLlamada()" class="btn-primary">💾 Guardar Llamada</button>
                    <button onclick="cerrarModalRegistroLlamada()" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Llenar datos del paciente
    document.getElementById('llamadaPacienteNombre').textContent = patient.nombreApellido || '-';
    document.getElementById('llamadaPacienteRut').textContent = patient.rut || '-';
    document.getElementById('llamadaPacienteContacto').textContent = patient.nContacto || '-';
    
    // AGREGAR OBSERVACIONES E INDICACIONES ANESTESIÓLOGO
    const observacionesText = patient.observaciones || 'Sin observaciones registradas';
    const indicacionesText = patient.indicacionesAnest || 'Sin indicaciones registradas';
    
    document.getElementById('llamadaPacienteObservaciones').innerHTML = observacionesText;
    document.getElementById('llamadaPacienteIndicaciones').innerHTML = indicacionesText;
    
    // Fecha actual por defecto
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    document.getElementById('llamadaFechaHora').value = `${año}-${mes}-${dia}T${horas}:${minutos}`;
    
    // Limpiar campos
    document.getElementById('llamadaNombreRec').value = '';
    document.getElementById('llamadaRutRec').value = '';
    document.getElementById('llamadaParentesco').value = '';
    document.getElementById('llamadaMotivo').value = '';
    document.getElementById('llamadaRespuesta').value = '';
    document.getElementById('llamadaObservaciones').value = '';
    document.getElementById('llamadaProximoLlamado').value = '';
    
    // ========== VALIDACIÓN DE RUT DEL RECEPTOR EN TIEMPO REAL ==========
    const rutRecInput = document.getElementById('llamadaRutRec');
    if (rutRecInput) {
        // Eliminar eventos anteriores para evitar duplicados
        const newRutRecInput = rutRecInput.cloneNode(true);
        rutRecInput.parentNode.replaceChild(newRutRecInput, rutRecInput);
        
        newRutRecInput.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            // Limpiar mensaje anterior
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (rut && !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else if (rut && validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                // Formatear el RUT
                this.value = formatRut(rutLimpio);
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
            }
        });
        
        newRutRecInput.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    // ====================================================================
    
    modal.style.display = 'flex';
}

function cerrarModalRegistroLlamada() {
    const modal = document.getElementById('modalRegistroLlamada');
    if (modal) modal.style.display = 'none';
}


// ====================== GUARDAR REGISTRO DE LLAMADA (VERSIÓN FINAL - MODAL FORZADO) ======================
let isSubmittingLlamada = false;

async function guardarRegistroLlamada() {
    console.log("🚀 guardarRegistroLlamada() INICIADA");

    if (!currentModalPatient) {
        alert("❌ No hay paciente seleccionado");
        return;
    }

    if (isSubmittingLlamada) {
        console.log("⏳ Ya hay un guardado en progreso...");
        return;
    }

    isSubmittingLlamada = true;

    // === FORZAR VISIBILIDAD DEL MODAL ===
    const loading = document.getElementById('loadingModal');
    if (loading) {
        loading.style.display = 'flex';
        loading.style.zIndex = '99999';
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
        console.log("✅ Modal FORZADO visible (z-index alto)");
    } else {
        console.error("❌ No se encontró el elemento #loadingModal");
    }

    const patientKey = currentModalPatient.firebaseKey;
    

// ========== FORMATEAR Y VALIDAR RUT DEL RECEPTOR ==========
const rutReceptorInput = document.getElementById('llamadaRutRec');
const rutReceptor = rutReceptorInput.value;

// PASO 1: Limpiar RUT (quitar puntos, guiones y espacios) para validar
const rutReceptorLimpio = rutReceptor ? rutReceptor.replace(/[^0-9kK]/g, '').toUpperCase() : '';

// PASO 2: Validar RUT del receptor (opcional - solo si se ingresó)
if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
    alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
    rutReceptorInput.focus();
    isSubmittingLlamada = false;
    if (loading) loading.style.display = 'none';
    return;
}

// PASO 3: Formatear RUT (si se ingresó) y actualizar el campo visual
const rutReceptorFormateado = rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '';
if (rutReceptorLimpio) {
    rutReceptorInput.value = rutReceptorFormateado;  // ← Actualizar el campo visual
}
// ==========================================================


const llamadaData = {
    fechaLlamada: document.getElementById('llamadaFechaHora').value,
    nombreRec: document.getElementById('llamadaNombreRec').value,
    rutRec: rutReceptorFormateado,
    parentesco: document.getElementById('llamadaParentesco').value,
    motivo: document.getElementById('llamadaMotivo').value,
    respuesta: document.getElementById('llamadaRespuesta').value,
    observaciones: document.getElementById('llamadaObservaciones').value,
    proximoLlamado: document.getElementById('llamadaProximoLlamado').value,
    registradoPor: currentUser ? currentUser.email : 'Sistema',
    timestamp: firebase.database.ServerValue.TIMESTAMP
};
    
    if (!llamadaData.motivo || !llamadaData.respuesta) {
        alert("❌ Motivo y Respuesta son obligatorios");
        isSubmittingLlamada = false;
        if (loading) loading.style.display = 'none';
        return;
    }

    // ========== VALIDAR RUT DEL RECEPTOR (si se ingresó) ==========
if (llamadaData.rutRec && !validarRutChileno(llamadaData.rutRec)) {
    alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
    isSubmittingLlamada = false;
    if (loading) loading.style.display = 'none';
    return;
}

    guardarFiltrosEnStorage();

    try {
        await db.ref(`patients/${patientKey}/historialLlamadas`).push(llamadaData);
        
        if (llamadaData.proximoLlamado) {
            await db.ref(`patients/${patientKey}`).update({ fechaProximoLlamado: llamadaData.proximoLlamado });
        } else {
            await db.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
        }
        
        await db.ref(`patients/${patientKey}/historial`).push({
            fecha: new Date().toISOString(),
            usuario: currentUser ? currentUser.email : 'Sistema',
            accion: "Registro de Llamada",
            descripcion: `Llamada registrada - Motivo: ${llamadaData.motivo} - Respuesta: ${llamadaData.respuesta}`
        });
        
        alert("✅ Registro de llamada guardado correctamente");
        cerrarModalRegistroLlamada();
        
        await loadPatients();
        restaurarFiltros();
        showPatientModal(patientKey);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al guardar: " + error.message);
    } finally {
        isSubmittingLlamada = false;
        const loadingClose = document.getElementById('loadingModal');
        if (loadingClose) {
            loadingClose.style.display = 'none';
            loadingClose.style.zIndex = '';
            console.log("✅ Modal cerrado");
        }
    }
}
// Ver detalle de llamada en modal

async function verDetalleLlamada(patientKey, llamadaKey) {
    const snapshot = await db.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
    const llamada = snapshot.val();
    
    if (!llamada) return;
    
    let modal = document.getElementById('modalDetalleLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDetalleLlamada';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="cerrarModalDetalleLlamada()">&times;</span>
                <h2 style="color:#1e40af;">📋 Detalle de Llamada</h2>
                <div id="detalleLlamadaBody" style="margin-top:20px;"></div>
                <div class="modal-buttons" id="detalleLlamadaButtons" style="margin-top:20px;">
                    <button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const fecha = new Date(llamada.fechaLlamada);
    const body = document.getElementById('detalleLlamadaBody');
    body.innerHTML = `
        <p><strong>📅 Fecha y Hora:</strong> ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}</p>
        <p><strong>👤 Receptor:</strong> ${llamada.nombreRec || '-'}</p>
        <p><strong>🆔 RUT Receptor:</strong> ${llamada.rutRec || '-'}</p>
        <p><strong>👨‍👩‍👧 Parentesco:</strong> ${llamada.parentesco || '-'}</p>
        <hr>
        <p><strong>📋 Motivo:</strong> ${llamada.motivo || '-'}</p>
        <p><strong>📝 Respuesta:</strong> ${llamada.respuesta || '-'}</p>
        <p><strong>📝 Observaciones:</strong> ${llamada.observaciones || '-'}</p>
        <hr>
        <p><strong>📅 Próximo Llamado:</strong> ${llamada.proximoLlamado ? formatDate(llamada.proximoLlamado) : 'No programado'}</p>
        <p><strong>👤 Registrado por:</strong> ${llamada.registradoPor || '-'}</p>
    `;
    
    // Agregar botones de editar/eliminar SOLO para administrador
    const buttonsContainer = document.getElementById('detalleLlamadaButtons');
    if (currentUserRole === 'admin') {
        buttonsContainer.innerHTML = `
            <button onclick="abrirModalEditarLlamada('${patientKey}', '${llamadaKey}')" class="btn-primary" style="background:#f59e0b;">✏️ Editar Llamada</button>
            <button onclick="eliminarRegistroLlamada('${patientKey}', '${llamadaKey}')" class="btn-danger">🗑️ Eliminar Llamada</button>
            <button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>
        `;
    } else {
        buttonsContainer.innerHTML = `<button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>`;
    }
    
    modal.style.display = 'flex';
}

function cerrarModalDetalleLlamada() {
    const modal = document.getElementById('modalDetalleLlamada');
    if (modal) modal.style.display = 'none';
}

// Imprimir todas las llamadas realizadas
async function imprimirTodasLasLlamadas() {
    const todasLasLlamadas = [];
    
    for (const patient of patients) {
        if (patient.historialLlamadas) {
            const llamadas = Object.values(patient.historialLlamadas);
            llamadas.forEach(llamada => {
                todasLasLlamadas.push({
                    paciente: patient.nombreApellido,
                    rut: patient.rut,
                    telefono: patient.nContacto,
                    ...llamada
                });
            });
        }
    }
    
    // Ordenar por fecha de llamada (más reciente primero)
    todasLasLlamadas.sort((a, b) => new Date(b.fechaLlamada) - new Date(a.fechaLlamada));
    
    const printWindow = window.open('', '_blank');
    let tablaHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Llamadas Realizadas</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    font-size: 11px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 3px solid #1e40af;
                    padding-bottom: 15px;
                }
                .logo { height: 70px; }
                h1 { color: #1e40af; font-size: 18px; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #94a3b8;
                    padding: 6px 4px;
                    text-align: left;
                    vertical-align: top;
                }
                th {
                    background: #1e40af;
                    color: white;
                    font-weight: 600;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 10px;
                    color: #64748b;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" class="logo" onerror="this.style.display='none'">
                <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                <h2>REPORTE DE LLAMADAS REALIZADAS</h2>
                <p>Generado: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                <p><strong>Total de llamadas registradas: ${todasLasLlamadas.length}</strong></p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Fecha Llamada</th>
                        <th>Paciente</th>
                        <th>RUT</th>
                        <th>Teléfono</th>
                        <th>Receptor</th>
                        <th>Motivo</th>
                        <th>Respuesta</th>
                        <th>Funcionario</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    todasLasLlamadas.forEach(llamada => {
        const fecha = new Date(llamada.fechaLlamada);
        tablaHTML += `
            <tr>
                <td>${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.paciente || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.rut || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.telefono || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.nombreRec || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.motivo || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.respuesta || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
                <td>${llamada.funcionario || '-'}</span></strong></span></span></span></strong></span></span></span></span></span></td>
            </tr>
        `;
    });
    
    tablaHTML += `
                </tbody>
            赶
            <div class="footer">
                Reporte generado por Sistema Unidad Prequirúrgica - Hospital de Illapel
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(tablaHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}



// ====================== EDITAR LLAMADA (SOLO ADMIN) ======================
async function abrirModalEditarLlamada(patientKey, llamadaKey) {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos para editar llamadas.");
        return;
    }
    
    const snapshot = await db.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
    const llamada = snapshot.val();
    
    if (!llamada) return;
    
    // Cerrar modal de detalle primero
    cerrarModalDetalleLlamada();
    
    // Crear o obtener modal de edición
    let modal = document.getElementById('modalEditarLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalEditarLlamada';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <span class="close" onclick="cerrarModalEditarLlamada()">&times;</span>
                <h2 style="color:#1e40af; margin-bottom:20px;">✏️ Editar Registro de Llamada</h2>
                <input type="hidden" id="editLlamadaPatientKey">
                <input type="hidden" id="editLlamadaKey">
                
                <div class="form-group">
                    <label>📅 Fecha y Hora de la Llamada</label>
                    <input type="datetime-local" id="editLlamadaFechaHora" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>👤 Nombre del Receptor</label>
                    <input type="text" id="editLlamadaNombreRec" placeholder="Nombre y Apellido" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>🆔 RUT del Receptor</label>
                    <input type="text" id="editLlamadaRutRec" placeholder="Sin puntos con guión" style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>👨‍👩‍👧 Parentesco con el Paciente</label>
                    <input type="text" id="editLlamadaParentesco" placeholder="Ej: Madre, Padre, Hermano, etc." style="width:100%; padding:10px;">
                </div>
                
                <div class="form-group">
                    <label>📋 Motivo de la Llamada</label>
                    <select id="editLlamadaMotivo" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="HORA DE EXAMENES">HORA DE EXAMENES</option>
                        <option value="HORA DE ANESTESIA">HORA DE ANESTESIA</option>
                        <option value="ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO">ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO</option>
                        <option value="FECHA CIRUGIA">FECHA CIRUGIA</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📝 Respuesta del Paciente/Receptor</label>
                    <select id="editLlamadaRespuesta" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="ACEPTA">ACEPTA</option>
                        <option value="RECHAZA">RECHAZA</option>
                        <option value="POSTERGA">POSTERGA</option>
                        <option value="NO RESPONDE LLAMADA">NO RESPONDE LLAMADA</option>
                        <option value="ENTREGARA INFORMACION">ENTREGARA INFORMACION</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📝 Observaciones de la Llamada</label>
                    <textarea id="editLlamadaObservaciones" rows="3" style="width:100%; padding:10px;"></textarea>
                </div>
                
                <div class="form-group">
                    <label>📅 Programar Próximo Llamado</label>
                    <input type="date" id="editLlamadaProximoLlamado" style="width:100%; padding:10px;">
                    <small style="color:#64748b;">Si se programa una fecha, aparecerá en la lista de pendientes</small>
                </div>
                
                <div class="modal-buttons" style="margin-top:20px;">
                    <button onclick="guardarEdicionLlamada()" class="btn-primary">💾 Guardar Cambios</button>
                    <button onclick="cerrarModalEditarLlamada()" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Formatear fecha para input datetime-local
    let fechaHoraValue = '';
    if (llamada.fechaLlamada) {
        const fecha = new Date(llamada.fechaLlamada);
        if (!isNaN(fecha.getTime())) {
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            const horas = String(fecha.getHours()).padStart(2, '0');
            const minutos = String(fecha.getMinutes()).padStart(2, '0');
            fechaHoraValue = `${año}-${mes}-${dia}T${horas}:${minutos}`;
        }
    }
    
    // Formatear fecha próximo llamado
    let fechaProximoValue = '';
    if (llamada.proximoLlamado) {
        const fecha = new Date(llamada.proximoLlamado);
        if (!isNaN(fecha.getTime())) {
            fechaProximoValue = fecha.toISOString().split('T')[0];
        }
    }
    
    // Llenar campos
    document.getElementById('editLlamadaPatientKey').value = patientKey;
    document.getElementById('editLlamadaKey').value = llamadaKey;
    document.getElementById('editLlamadaFechaHora').value = fechaHoraValue;
    document.getElementById('editLlamadaNombreRec').value = llamada.nombreRec || '';
    
    // Formatear RUT al cargar
    const rutRec = llamada.rutRec || '';
    const rutRecLimpio = rutRec ? rutRec.replace(/[^0-9kK]/g, '').toUpperCase() : '';
    const rutRecFormateado = rutRecLimpio ? formatRut(rutRecLimpio) : '';
    document.getElementById('editLlamadaRutRec').value = rutRecFormateado;
    
    document.getElementById('editLlamadaParentesco').value = llamada.parentesco || '';
    document.getElementById('editLlamadaMotivo').value = llamada.motivo || '';
    document.getElementById('editLlamadaRespuesta').value = llamada.respuesta || '';
    document.getElementById('editLlamadaObservaciones').value = llamada.observaciones || '';
    document.getElementById('editLlamadaProximoLlamado').value = fechaProximoValue;

    // ========== VALIDAR RUT AUTOMÁTICAMENTE AL CARGAR ==========
    const editRutInput = document.getElementById('editLlamadaRutRec');
    if (editRutInput && editRutInput.value) {
        const event = new Event('blur');
        editRutInput.dispatchEvent(event);
    }
    // =========================================================
    
       // ========== VALIDACIÓN DE RUT DEL RECEPTOR EN TIEMPO REAL ==========
    const editRutRecInput = document.getElementById('editLlamadaRutRec');
    if (editRutRecInput) {
        // Eliminar eventos anteriores para evitar duplicados
        const newEditRutRecInput = editRutRecInput.cloneNode(true);
        editRutRecInput.parentNode.replaceChild(newEditRutRecInput, editRutRecInput);
        
        newEditRutRecInput.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            // Limpiar mensaje anterior
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (rut && !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else if (rut && validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                // Formatear el RUT
                this.value = formatRut(rutLimpio);
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
            }
        });
        
        newEditRutRecInput.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    // ====================================================================
    
    modal.style.display = 'flex';
}

// ====================== GUARDAR EDICIÓN DE LLAMADA (MODAL ULTRA FORZADO) ======================
let isEditingLlamada = false;

async function guardarEdicionLlamada() {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos para editar llamadas.");
        return;
    }

    if (isEditingLlamada) {
        console.log("⏳ Edición de llamada ya en progreso...");
        return;
    }

    isEditingLlamada = true;

    const patientKey = document.getElementById('editLlamadaPatientKey').value;
    const llamadaKey = document.getElementById('editLlamadaKey').value;

    if (!patientKey || !llamadaKey) {
        alert("❌ Error: No se encontró la llamada a editar.");
        isEditingLlamada = false;
        return;
    }

    // === ULTRA FORZAR MODAL DE ESPERA ===
    const loading = document.getElementById('loadingModal');
    if (loading) {
        loading.style.display = 'flex';
        loading.style.zIndex = '999999';      // Aún más alto
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
        loading.style.background = 'rgba(0,0,0,0.7)'; // Fondo más fuerte
        console.log("✅ Modal de edición ULTRA FORZADO visible");
    } else {
        console.error("❌ No se encontró el elemento #loadingModal");
    }

    guardarFiltrosEnStorage();

    try {
// ========== FORMATEAR Y VALIDAR RUT DEL RECEPTOR ==========
const rutReceptor = document.getElementById('editLlamadaRutRec').value;

// PASO 1: Limpiar RUT (quitar puntos, guiones y espacios) para validar
const rutReceptorLimpio = rutReceptor ? rutReceptor.replace(/[^0-9kK]/g, '').toUpperCase() : '';

// PASO 2: Validar RUT del receptor (opcional - solo si se ingresó)
if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
    alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
    document.getElementById('editLlamadaRutRec').focus();
    isEditingLlamada = false;
    if (loading) loading.style.display = 'none';
    return;
}

// PASO 3: Formatear RUT (si se ingresó)
const rutReceptorFormateado = rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '';



// ==========================================================

const llamadaData = {
    fechaLlamada: document.getElementById('editLlamadaFechaHora').value,
    nombreRec: document.getElementById('editLlamadaNombreRec').value,
    rutRec: rutReceptorFormateado,
    parentesco: document.getElementById('editLlamadaParentesco').value,
    motivo: document.getElementById('editLlamadaMotivo').value,
    respuesta: document.getElementById('editLlamadaRespuesta').value,
    observaciones: document.getElementById('editLlamadaObservaciones').value,
    proximoLlamado: document.getElementById('editLlamadaProximoLlamado').value,
    editadoPor: currentUser ? currentUser.email : 'Sistema',
    editadoEn: firebase.database.ServerValue.TIMESTAMP
};

        if (!llamadaData.motivo || !llamadaData.respuesta) {
            alert("❌ Motivo y Respuesta son obligatorios");
            return;
        }


        // ========== VALIDAR RUT DEL RECEPTOR (si se ingresó) ==========
if (llamadaData.rutRec && !validarRutChileno(llamadaData.rutRec)) {
    alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
    return;
}
        await db.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).update(llamadaData);

        if (llamadaData.proximoLlamado) {
            await db.ref(`patients/${patientKey}`).update({ fechaProximoLlamado: llamadaData.proximoLlamado });
        } else {
            const snapshot = await db.ref(`patients/${patientKey}/historialLlamadas`).once('value');
            let tieneProximo = false;
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const llamada = child.val();
                    if (llamada.proximoLlamado && child.key !== llamadaKey) tieneProximo = true;
                });
            }
            if (!tieneProximo) {
                await db.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
            }
        }

        alert("✅ Llamada actualizada correctamente");
        cerrarModalEditarLlamada();
        
        await loadPatients();
        restaurarFiltros();
        showPatientModal(patientKey);

    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        isEditingLlamada = false;
        const loadingClose = document.getElementById('loadingModal');
        if (loadingClose) {
            loadingClose.style.display = 'none';
            loadingClose.style.zIndex = '';
            loadingClose.style.background = '';
            console.log("✅ Modal de edición cerrado");
        }
    }
}

function cerrarModalEditarLlamada() {
    const modal = document.getElementById('modalEditarLlamada');
    if (modal) modal.style.display = 'none';
}


// ====================== ELIMINAR REGISTRO DE LLAMADA (MODAL FORZADO) ======================
let isDeletingLlamada = false;

async function eliminarRegistroLlamada(patientKey, llamadaKey) {
    if (currentUserRole !== 'admin') {
        alert("❌ No tienes permisos para eliminar registros de llamadas.");
        return;
    }
    
    if (isDeletingLlamada) {
        console.log("⏳ Eliminación ya en progreso...");
        return;
    }

    if (!confirm("⚠️ ¿Estás seguro de eliminar este registro de llamada?\n\nEsta acción NO se registra en el historial y NO se puede deshacer.")) {
        return;
    }

    isDeletingLlamada = true;

    // === FORZAR MODAL DE ESPERA ===
    const loading = document.getElementById('loadingModal');
    if (loading) {
        loading.style.display = 'flex';
        loading.style.zIndex = '999999';
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
        console.log("✅ Modal de eliminación FORZADO visible");
    } else {
        console.error("❌ No se encontró el elemento #loadingModal");
    }

    guardarFiltrosEnStorage();

    try {
        // Obtener la llamada antes de eliminar para verificar próxima fecha
        const snapshot = await db.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
        const llamada = snapshot.val();
        
        // Eliminar el registro
        await db.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).remove();
        
        // Si la llamada eliminada tenía una fecha de próximo llamado, verificar si actualizar
        if (llamada && llamada.proximoLlamado) {
            const todasLlamadasSnap = await db.ref(`patients/${patientKey}/historialLlamadas`).once('value');
            let tieneProximo = false;
            if (todasLlamadasSnap.exists()) {
                todasLlamadasSnap.forEach(child => {
                    const l = child.val();
                    if (l.proximoLlamado) tieneProximo = true;
                });
            }
            if (!tieneProximo) {
                await db.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
            }
        }
        
        alert("✅ Registro de llamada eliminado correctamente");
        cerrarModalDetalleLlamada();
        
        await loadPatients();
        restaurarFiltros();
        showPatientModal(patientKey);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar: " + error.message);
    } finally {
        isDeletingLlamada = false;
        const loadingClose = document.getElementById('loadingModal');
        if (loadingClose) {
            loadingClose.style.display = 'none';
            loadingClose.style.zIndex = '';
            console.log("✅ Modal de eliminación cerrado");
        }
    }
}






// ====================== FORMATEAR RUT ======================
function formatearRutParaBusqueda(rut) {
    if (!rut) return '';
    // Limpiar caracteres no deseados
    let clean = rut.toString().replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 7) return '';
    
    const dv = clean.slice(-1);
    let numero = clean.slice(0, -1);
    // Agregar puntos
    numero = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${numero}-${dv}`;
}

// ====================== CONVERTIR FECHA AL FORMATO DE LA APP ======================
function convertirFechaApp(fechaStr) {
    if (!fechaStr) return '';
    
    // Si ya es ISO string
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
        return fechaStr;
    }
    
    // Si es número de Excel
    if (typeof fechaStr === 'number') {
        const fecha = new Date((fechaStr - 25569) * 86400000);
        return fecha.toISOString();
    }
    
    // Si es string en formato YYYY-MM-DD
    if (typeof fechaStr === 'string' && fechaStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const fecha = new Date(fechaStr);
        return fecha.toISOString();
    }
    
    // Si es string en formato DD/MM/YYYY
    if (typeof fechaStr === 'string' && fechaStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const partes = fechaStr.split('/');
        const fecha = new Date(partes[2], partes[1] - 1, partes[0]);
        return fecha.toISOString();
    }
    
    // Si es string en formato DD-MM-YYYY
    if (typeof fechaStr === 'string' && fechaStr.match(/^\d{2}-\d{2}-\d{4}/)) {
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[2], partes[1] - 1, partes[0]);
        return fecha.toISOString();
    }
    
    // Intentar con Date directamente
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
        return fecha.toISOString();
    }
    
    console.warn(`⚠️ Fecha no reconocida: ${fechaStr}`);
    return '';
}

// ====================== MIGRAR LLAMADAS DESDE EXCEL ======================
async function migrarLlamadasDesdeExcel() {
    // Verificar permisos de administrador
    if (currentUserRole !== 'admin') {
        alert("❌ Solo los administradores pueden migrar llamadas.");
        return;
    }
    
    // Crear input de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const loading = document.getElementById('loadingModal');
        if (loading) loading.style.display = 'flex';
        
        try {
            // Leer el archivo Excel
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            
            console.log(`📊 Archivo cargado: ${rows.length} registros en Excel`);
            
            // Mostrar nombres de columnas para referencia
            if (rows.length > 0) {
                console.log("📋 Columnas encontradas:", Object.keys(rows[0]));
            }
            
            // Obtener todos los pacientes actuales de la app
            const snapshot = await db.ref('patients').once('value');
            const pacientesMap = new Map(); // RUT formateado -> firebaseKey
            const pacientesInfo = new Map(); // RUT formateado -> nombre
            
            snapshot.forEach((child) => {
                const patient = child.val();
                const firebaseKey = child.key;
                
                if (patient.rut) {
                    const rutFormateado = formatearRutParaBusqueda(patient.rut);
                    if (rutFormateado) {
                        pacientesMap.set(rutFormateado, firebaseKey);
                        pacientesInfo.set(rutFormateado, patient.nombreApellido || 'Desconocido');
                    }
                }
            });
            
            console.log(`👥 Pacientes activos en la app: ${pacientesMap.size}`);
            
            // Procesar registros
            const registrosPorPaciente = new Map(); // firebaseKey -> array de llamadas
            let erroresFecha = 0;
            let erroresRut = 0;
            let noEncontrados = 0;
            
            for (const row of rows) {
                // Extraer RUT del paciente (columna: RUT_PACIENTE)
                let rutExcel = row.RUT_PACIENTE || row.rut_paciente || row.RUT || row.rut || '';
                
                if (!rutExcel) {
                    console.warn(`⚠️ Registro sin RUT_PACIENTE, omitido`);
                    erroresRut++;
                    continue;
                }
                
                const rutFormateado = formatearRutParaBusqueda(rutExcel.toString());
                
                if (!rutFormateado) {
                    console.warn(`⚠️ RUT inválido: ${rutExcel}`);
                    erroresRut++;
                    continue;
                }
                
                // Verificar si el paciente existe en la app
                const patientKey = pacientesMap.get(rutFormateado);
                if (!patientKey) {
                    console.log(`❌ Paciente no encontrado: ${rutFormateado}`);
                    noEncontrados++;
                    continue;
                }
                
                // Extraer fecha (columna: FECHA_LLAMADA) - puede ser número de Excel o string
                let fechaRaw = row.FECHA_LLAMADA || row.fecha_llamada || row.FECHA || row.fecha || '';
                
                if (!fechaRaw) {
                    console.warn(`⚠️ Registro sin fecha para RUT ${rutFormateado}`);
                    erroresFecha++;
                    continue;
                }
                
                // Convertir fecha (soporta número de Excel)
                const fechaLlamada = convertirFechaApp(fechaRaw);
                
                if (!fechaLlamada) {
                    console.warn(`⚠️ Fecha no convertible: "${fechaRaw}" para RUT ${rutFormateado}`);
                    erroresFecha++;
                    continue;
                }
                
                // Extraer demás campos
                const motivo = row.MOTIVO || row.motivo || row.RAZON || '';
                const nombreRec = row.RECEPTOR || row.receptor || row.NOMBRE_RECEPTOR || '';
                const rutRec = row.RUT_RECEPTOR || row.rut_receptor || '';
                const parentesco = row.PARENTESCO || row.parentesco || '';
                const observaciones = row.OBSERVACIONES || row.observaciones || '';
                const respuesta = row.RESPUESTA || row.respuesta || '';
                const proximoLlamadoRaw = row.PROXIMO_LLAMADO || row.proximo_llamado || '';
                let proximoLlamado = '';
                
                if (proximoLlamadoRaw) {
                    proximoLlamado = convertirFechaApp(proximoLlamadoRaw);
                }
                
                const llamadaData = {
                    fechaLlamada: fechaLlamada,
                    motivo: motivo,
                    nombreRec: nombreRec,
                    rutRec: rutRec,
                    parentesco: parentesco,
                    observaciones: observaciones,
                    respuesta: respuesta,
                    proximoLlamado: proximoLlamado,
                    registradoPor: currentUser?.email || 'Migración Excel',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Agrupar por paciente
                if (!registrosPorPaciente.has(patientKey)) {
                    registrosPorPaciente.set(patientKey, []);
                }
                registrosPorPaciente.get(patientKey).push(llamadaData);
            }
            
            const totalLlamadas = Array.from(registrosPorPaciente.values()).reduce((a, b) => a + b.length, 0);
            
            console.log(`\n📊 ESTADÍSTICAS:`);
            console.log(`   ✅ Registros válidos: ${totalLlamadas}`);
            console.log(`   👥 Pacientes afectados: ${registrosPorPaciente.size}`);
            console.log(`   ❌ Pacientes no encontrados: ${noEncontrados}`);
            console.log(`   ❌ Errores de RUT: ${erroresRut}`);
            console.log(`   ❌ Errores de fecha: ${erroresFecha}`);
            
            if (totalLlamadas === 0) {
                alert("❌ No hay registros válidos para migrar.\n\nRevisa la consola (F12) para ver los detalles.");
                if (loading) loading.style.display = 'none';
                return;
            }
            
            // Confirmar migración
            if (!confirm(`⚠️ ¿MIGRAR ${totalLlamadas} llamadas a ${registrosPorPaciente.size} pacientes?\n\n❌ Registros ignorados: ${noEncontrados + erroresRut + erroresFecha}\n\n⚠️ Esta acción no se puede deshacer.`)) {
                if (loading) loading.style.display = 'none';
                return;
            }
            
            // Migrar llamadas a Firebase
            let migradas = 0;
            let errores = 0;
            
            for (const [patientKey, llamadas] of registrosPorPaciente) {
                const nombrePaciente = pacientesInfo.get([...pacientesMap.entries()].find(e => e[1] === patientKey)?.[0]) || 'Desconocido';
                console.log(`📝 Procesando: ${nombrePaciente} - ${llamadas.length} llamadas`);
                
                for (const llamada of llamadas) {
                    try {
                        await db.ref(`patients/${patientKey}/historialLlamadas`).push(llamada);
                        migradas++;
                        
                        if (migradas % 100 === 0) {
                            console.log(`✅ Progreso: ${migradas}/${totalLlamadas} llamadas migradas`);
                        }
                    } catch (error) {
                        errores++;
                        console.error(`❌ Error al migrar: ${error.message}`);
                    }
                }
            }
            
            // Resultado final
            alert(`✅ MIGRACIÓN COMPLETADA\n\n📞 Llamadas migradas: ${migradas}\n👥 Pacientes afectados: ${registrosPorPaciente.size}\n❌ Errores: ${errores}\n📊 Registros ignorados: ${noEncontrados + erroresRut + erroresFecha}`);
            
            // Recargar pacientes y actualizar dashboard
            loadPatients();
            
        } catch (error) {
            console.error(error);
            alert("❌ Error al procesar el archivo: " + error.message);
        } finally {
            if (loading) loading.style.display = 'none';
        }
    };
    
    input.click();
}

// ====================== FORMATEAR RUT ======================
function formatearRutParaBusqueda(rut) {
    if (!rut) return '';
    // Limpiar caracteres no deseados
    let clean = rut.toString().replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 7) return '';
    
    const dv = clean.slice(-1);
    let numero = clean.slice(0, -1);
    // Agregar puntos
    numero = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${numero}-${dv}`;
}

// ====================== CONVERTIR FECHA (SOPORTA NÚMEROS DE EXCEL) ======================
function convertirFechaApp(fechaStr) {
    if (!fechaStr) return '';
    
    // Si ya es ISO string
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
        return fechaStr;
    }
    
    // Si es número de Excel (fecha serial) - CORREGIDO
    if (typeof fechaStr === 'number') {
        // Excel cuenta días desde el 1/1/1900, pero tiene un error de 1 día
        const fecha = new Date((fechaStr - 25569) * 86400000);
        if (!isNaN(fecha.getTime())) {
            return fecha.toISOString();
        }
    }
    
    // Si es string, probar diferentes formatos
    if (typeof fechaStr === 'string') {
        let fecha = null;
        
        // Formato: DD/MM/YYYY
        let match = fechaStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            const dia = match[1].padStart(2, '0');
            const mes = match[2].padStart(2, '0');
            const año = match[3];
            fecha = new Date(`${año}-${mes}-${dia}T00:00:00Z`);
            if (!isNaN(fecha.getTime())) return fecha.toISOString();
        }
        
        // Formato: YYYY-MM-DD
        match = fechaStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
            const año = match[1];
            const mes = match[2].padStart(2, '0');
            const dia = match[3].padStart(2, '0');
            fecha = new Date(`${año}-${mes}-${dia}T00:00:00Z`);
            if (!isNaN(fecha.getTime())) return fecha.toISOString();
        }
        
        // Intentar con Date directamente
        fecha = new Date(fechaStr);
        if (!isNaN(fecha.getTime())) {
            return fecha.toISOString();
        }
    }
    
    console.warn(`⚠️ Fecha no reconocida: ${fechaStr}`);
    return '';
}

/*aqui termina cargar registro de llamadas desde excel*/



// ====================== DESCARGAR REGISTRO DE LLAMADAS SOLO DE PACIENTES FILTRADOS ======================
async function descargarRegistroLlamadas() {
    if (!patients || patients.length === 0) {
        alert("❌ No hay pacientes cargados.");
        return;
    }
    
    // Obtener los pacientes actualmente filtrados en la tabla
    const pacientesFiltrados = obtenerPacientesFiltrados();
    
    if (pacientesFiltrados.length === 0) {
        alert("❌ No hay pacientes en la lista actual. Revisa los filtros aplicados.");
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        const todasLasLlamadas = [];
        
        for (const patient of pacientesFiltrados) {
            // Obtener el paciente completo desde Firebase (incluye historialLlamadas)
            const snapshot = await db.ref(`patients/${patient.firebaseKey}`).once('value');
            const patientCompleto = snapshot.val();
            
            if (patientCompleto && patientCompleto.historialLlamadas && Object.keys(patientCompleto.historialLlamadas).length > 0) {
                const llamadas = Object.values(patientCompleto.historialLlamadas);
                
                llamadas.forEach(llamada => {
                    // Formatear fecha para el Excel
                    let fechaLlamadaFormateada = '';
                    if (llamada.fechaLlamada) {
                        const fecha = new Date(llamada.fechaLlamada);
                        if (!isNaN(fecha.getTime())) {
                            fechaLlamadaFormateada = fecha.toLocaleDateString('es-CL') + ' ' + fecha.toLocaleTimeString('es-CL');
                        } else {
                            fechaLlamadaFormateada = llamada.fechaLlamada;
                        }
                    }
                    
                    let fechaProximoFormateada = '';
                    if (llamada.proximoLlamado) {
                        const fecha = new Date(llamada.proximoLlamado);
                        if (!isNaN(fecha.getTime())) {
                            fechaProximoFormateada = fecha.toLocaleDateString('es-CL');
                        } else {
                            fechaProximoFormateada = llamada.proximoLlamado;
                        }
                    }
                    
                    todasLasLlamadas.push({
                        'RUT PACIENTE': patientCompleto.rut || '',
                        'NOMBRE PACIENTE': patientCompleto.nombreApellido || '',
                        'TELÉFONO': patientCompleto.nContacto || '',
                        'ESPECIALIDAD': patientCompleto.especialidad || '',
                        'FECHA LLAMADA': fechaLlamadaFormateada,
                        'MOTIVO': llamada.motivo || '',
                        'RECEPTOR': llamada.nombreRec || '',
                        'RUT RECEPTOR': llamada.rutRec || '',
                        'PARENTESCO': llamada.parentesco || '',
                        'RESPUESTA': llamada.respuesta || '',
                        'OBSERVACIONES': llamada.observaciones || '',
                        'PRÓXIMO LLAMADO': fechaProximoFormateada,
                        'REGISTRADO POR': llamada.registradoPor || '',
                        'FECHA REGISTRO': llamada.timestamp ? new Date(llamada.timestamp).toLocaleDateString('es-CL') : ''
                    });
                });
            }
        }
        
        if (todasLasLlamadas.length === 0) {
            alert("❌ No hay registros de llamadas para los pacientes filtrados.");
            if (loading) loading.style.display = 'none';
            return;
        }
        
        // Ordenar por fecha de llamada (más reciente primero)
        todasLasLlamadas.sort((a, b) => {
            const fechaA = new Date(a['FECHA LLAMADA'].split(' ')[0].split('/').reverse().join('-'));
            const fechaB = new Date(b['FECHA LLAMADA'].split(' ')[0].split('/').reverse().join('-'));
            return fechaB - fechaA;
        });
        
        // Crear Excel
        const ws = XLSX.utils.json_to_sheet(todasLasLlamadas);
        
        // Ajustar anchos de columnas
        ws['!cols'] = [
            {wch:15}, // RUT PACIENTE
            {wch:30}, // NOMBRE PACIENTE
            {wch:15}, // TELÉFONO
            {wch:20}, // ESPECIALIDAD
            {wch:20}, // FECHA LLAMADA
            {wch:30}, // MOTIVO
            {wch:25}, // RECEPTOR
            {wch:15}, // RUT RECEPTOR
            {wch:15}, // PARENTESCO
            {wch:20}, // RESPUESTA
            {wch:40}, // OBSERVACIONES
            {wch:15}, // PRÓXIMO LLAMADO
            {wch:25}, // REGISTRADO POR
            {wch:12}  // FECHA REGISTRO
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro_Llamadas');
        
        // Descargar
        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Registro_Llamadas_${fecha}.xlsx`);
        
        alert(`✅ Reporte generado correctamente\n\n📞 Total de llamadas exportadas: ${todasLasLlamadas.length}\n👥 Pacientes considerados: ${pacientesFiltrados.length}`);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al generar el reporte: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ====================== OBTENER PACIENTES FILTRADOS ACTUALMENTE ======================
function obtenerPacientesFiltrados() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
     const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';
    
    let filtered = [...patients];
    
    if (busqueda) {
        filtered = filtered.filter(p => {
            const texto = `${p.nombreApellido || ''} ${p.rut || ''} ${p.diagnostico || ''} ${p.intervencion || ''} ${p.especialidad || ''} ${p.medicoTratante || ''}`.toLowerCase();
            return texto.includes(busqueda);
        });
    }
    
    if (especialidad) {
        filtered = filtered.filter(p => p.especialidad === especialidad);
    }
    
    if (medico) {
        filtered = filtered.filter(p => p.medicoTratante === medico);
    }
    
    if (estatus) {
        filtered = filtered.filter(p => p.estatusTabla === estatus);
    }

    if (prioridad) {  
        filtered = filtered.filter(p => p.prioridad === prioridad);
    }
    
    if (comuna) {
        filtered = filtered.filter(p => p.comuna === comuna);
    }
    
    if (fechaDesde || fechaHasta) {
        filtered = filtered.filter(p => {
            const fechaInd = new Date(p.fechaIndQx || 0);
            let pasa = true;
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
            return pasa;
        });
    }
    
    if (typeof soloSinFolio !== 'undefined' && soloSinFolio) {
        filtered = filtered.filter(p => {
            const folio = (p.folio || '').toString().trim();
            return folio === '';
        });
    }
    
    if (typeof mostrarDuplicados !== 'undefined' && mostrarDuplicados) {
        const rutCount = {};
        filtered.forEach(p => {
            if (p.rut) rutCount[p.rut] = (rutCount[p.rut] || 0) + 1;
        });
        filtered = filtered.filter(p => p.rut && rutCount[p.rut] > 1);
    }
    
    if (ocultarNoGestionables) {
        const noGestionables = ["EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO", "egreso", "rechazo", "traslado interno", "operado"];
        filtered = filtered.filter(p => {
            const estatusPaciente = (p.estatusTabla || '').toString().trim().toUpperCase();
            return !noGestionables.includes(estatusPaciente);
        });
    }

    return filtered;
}










// ====================== OBTENER TEXTO DE FILTROS APLICADOS ======================
function obtenerTextoFiltros() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';
    
    const filtros = [];
    if (busqueda) filtros.push(`🔍 Búsqueda: "${busqueda}"`);
    if (especialidad) filtros.push(`🏥 Especialidad: ${especialidad}`);
    if (medico) filtros.push(`👨‍⚕️ Médico: ${medico}`);
    if (estatus) filtros.push(`📊 Estatus: ${estatus}`);
    if (comuna) filtros.push(`🏠 Comuna: ${comuna}`);
    if (fechaDesde) filtros.push(`📅 Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`📅 Hasta: ${fechaHasta}`);
    if (typeof soloSinFolio !== 'undefined' && soloSinFolio) filtros.push(`📄 Solo sin folio`);
    if (typeof mostrarDuplicados !== 'undefined' && mostrarDuplicados) filtros.push(`🔄 Mostrando duplicados`);
    
    return filtros.length > 0 ? filtros.join(' | ') : 'Ningún filtro aplicado';
}









// ====================== IMPRIMIR REGISTRO DE LLAMADAS (SOLO PACIENTES FILTRADOS) ======================
async function imprimirRegistroLlamadas() {
    if (!patients || patients.length === 0) {
        alert("❌ No hay pacientes cargados.");
        return;
    }
    
    // Obtener los pacientes actualmente filtrados en la tabla
    const pacientesFiltrados = obtenerPacientesFiltrados();
    
    if (pacientesFiltrados.length === 0) {
        alert("❌ No hay pacientes en la lista actual. Revisa los filtros aplicados.");
        return;
    }
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    
    try {
        const todasLasLlamadas = [];
        
        for (const patient of pacientesFiltrados) {
            // Obtener el paciente completo desde Firebase (incluye historialLlamadas)
            const snapshot = await db.ref(`patients/${patient.firebaseKey}`).once('value');
            const patientCompleto = snapshot.val();
            
            if (patientCompleto && patientCompleto.historialLlamadas && Object.keys(patientCompleto.historialLlamadas).length > 0) {
                const llamadas = Object.values(patientCompleto.historialLlamadas);
                
                llamadas.forEach(llamada => {
                    // Formatear fecha
                    let fechaLlamadaFormateada = '';
                    if (llamada.fechaLlamada) {
                        const fecha = new Date(llamada.fechaLlamada);
                        if (!isNaN(fecha.getTime())) {
                            fechaLlamadaFormateada = fecha.toLocaleDateString('es-CL') + ' ' + fecha.toLocaleTimeString('es-CL');
                        } else {
                            fechaLlamadaFormateada = String(llamada.fechaLlamada);
                        }
                    }
                    
                    let fechaProximoFormateada = '';
                    if (llamada.proximoLlamado) {
                        const fecha = new Date(llamada.proximoLlamado);
                        if (!isNaN(fecha.getTime())) {
                            fechaProximoFormateada = fecha.toLocaleDateString('es-CL');
                        } else {
                            fechaProximoFormateada = String(llamada.proximoLlamado);
                        }
                    }
                    
                    // Asegurar que observaciones sea string
                    let observacionesText = '';
                    if (llamada.observaciones) {
                        observacionesText = String(llamada.observaciones);
                        if (observacionesText.length > 100) {
                            observacionesText = observacionesText.substring(0, 100) + '...';
                        }
                    }
                    
                    todasLasLlamadas.push({
                        rut: patientCompleto.rut || '',
                        nombre: patientCompleto.nombreApellido || '',
                        telefono: patientCompleto.nContacto || '',
                        especialidad: patientCompleto.especialidad || '',
                        fechaLlamada: fechaLlamadaFormateada,
                        motivo: llamada.motivo ? String(llamada.motivo) : '',
                        receptor: llamada.nombreRec ? String(llamada.nombreRec) : '',
                        rutReceptor: llamada.rutRec ? String(llamada.rutRec) : '',
                        parentesco: llamada.parentesco ? String(llamada.parentesco) : '',
                        respuesta: llamada.respuesta ? String(llamada.respuesta) : '',
                        observaciones: observacionesText,
                        proximoLlamado: fechaProximoFormateada,
                        registradoPor: llamada.registradoPor ? String(llamada.registradoPor) : ''
                    });
                });
            }
        }
        
        if (todasLasLlamadas.length === 0) {
            alert("❌ No hay registros de llamadas para los pacientes filtrados.");
            if (loading) loading.style.display = 'none';
            return;
        }
        
        // Ordenar por fecha de llamada (más reciente primero)
        todasLasLlamadas.sort((a, b) => {
            const fechaA = new Date(a.fechaLlamada.split(' ')[0].split('/').reverse().join('-'));
            const fechaB = new Date(b.fechaLlamada.split(' ')[0].split('/').reverse().join('-'));
            return fechaB - fechaA;
        });
        
        // Generar HTML para impresión
        const printWindow = window.open('', '_blank');
        
        let tablaHTML = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Registro de Llamadas - Unidad Prequirúrgica</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Roboto', Arial, sans-serif;
                        margin: 20px;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #1e2937;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 25px;
                        border-bottom: 3px solid #1e40af;
                        padding-bottom: 15px;
                    }
                    .logo {
                        height: 70px;
                    }
                    h1 {
                        font-size: 18px;
                        margin: 5px 0;
                        color: #1e40af;
                    }
                    h2 {
                        font-size: 14px;
                        margin: 3px 0;
                        color: #334155;
                    }
                    .filters-info {
                        background: #f8fafc;
                        padding: 10px;
                        margin-bottom: 20px;
                        border-radius: 8px;
                        font-size: 10px;
                        border: 1px solid #e2e8f0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    th, td {
                        border: 1px solid #94a3b8;
                        padding: 8px 6px;
                        text-align: left;
                        vertical-align: top;
                    }
                    th {
                        background: #1e40af;
                        color: white;
                        font-weight: 600;
                        font-size: 10px;
                    }
                    td {
                        font-size: 9px;
                    }
                    tr:nth-child(even) {
                        background: #f8fafc;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 9px;
                        color: #64748b;
                        border-top: 1px solid #cbd5e1;
                        padding-top: 10px;
                    }
                    .total-registros {
                        margin-top: 15px;
                        font-weight: bold;
                        text-align: right;
                        font-size: 10px;
                    }
                    @media print {
                        body {
                            margin: 10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="logo.png" alt="Hospital Illapel" class="logo" onerror="this.style.display='none'">
                    <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                    <h2>REGISTRO DE LLAMADAS REALIZADAS</h2>
                    <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                </div>
                
                <div class="filters-info">
                    <p><strong>📋 Filtros aplicados:</strong> ${obtenerTextoFiltros()}</p>
                    <p>✅ Total de llamadas: <strong>${todasLasLlamadas.length}</strong> | 👥 Pacientes considerados: <strong>${pacientesFiltrados.length}</strong></p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>RUT</th>
                            <th>Paciente</th>
                            <th>Teléfono</th>
                            <th>Especialidad</th>
                            <th>Fecha Llamada</th>
                            <th>Motivo</th>
                            <th>Receptor</th>
                            <th>Parentesco</th>
                            <th>Respuesta</th>
                            <th>Observaciones</th>
                            <th>Próximo Llamado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const llamada of todasLasLlamadas) {
            tablaHTML += `
                <tr>
                    <td>${llamada.rut || '-'}</td>
                    <td>${llamada.nombre || '-'}</td>
                    <td>${llamada.telefono || '-'}</td>
                    <td>${llamada.especialidad || '-'}</td>
                    <td>${llamada.fechaLlamada || '-'}</td>
                    <td>${llamada.motivo || '-'}</td>
                    <td>${llamada.receptor || '-'}</td>
                    <td>${llamada.parentesco || '-'}</td>
                    <td>${llamada.respuesta || '-'}</td>
                    <td style="max-width: 200px;">${llamada.observaciones || '-'}</td>
                    <td>${llamada.proximoLlamado || '-'}</td>
                </tr>
            `;
        }
        
        tablaHTML += `
                    </tbody>
                </table>
                
                <div class="total-registros">
                    Total de llamadas registradas: ${todasLasLlamadas.length}
                </div>
                
                <div class="footer">
                    Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(tablaHTML);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    } catch (error) {
        console.error(error);
        alert("❌ Error al generar el reporte: " + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}




// Variable global para el filtro de pacientes sin programación
let soloSinProgramacion = false;

// Función para toggle del filtro de pacientes sin fecha de programación
function toggleSinProgramacion() {
    soloSinProgramacion = !soloSinProgramacion;
    const btn = document.getElementById('btnSinProgramacion');
    
    if (btn) {
        if (soloSinProgramacion) {
            btn.style.background = '#eab308';
            btn.style.color = 'black';
            btn.textContent = '✅ Solo Sin Fecha Programación';
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = '📅 Sin Fecha Programación';
        }
    }
    
    filterPatients();
    guardarFiltrosEnStorage();
}




// ====================== VISOR HISTÓRICO RDLL ======================
let datosRdll = [];
let datosRdllFiltrados = [];
let editandoRdllKey = null;
const RDLL_PATH = 'rdll_historico';

async function cargarRdll() {
    try {
        const snap = await db.ref('rdll_historico').once('value');
        const data = snap.val();
        
        datosRdll = data ? Object.entries(data).map(([k, v]) => ({ key: k, ...v })) : [];
        datosRdll.sort((a, b) => new Date(b.FECHA || 0) - new Date(a.FECHA || 0));
        filtrarRdll();
        
        console.log(`✅ RDLL cargado: ${datosRdll.length} registros`);
    } catch (e) { 
        console.error("Error cargando RDLL:", e); 
    }
}

function filtrarRdll() {
    const busq = (document.getElementById('busquedaRdll')?.value || '').toLowerCase().trim();
    const campo = document.getElementById('campoFiltroRdll')?.value || 'todos';
    if (!busq) datosRdllFiltrados = [...datosRdll];
    else {
        datosRdllFiltrados = datosRdll.filter(r => {
            if (campo === 'todos') return Object.values(r).some(v => v && String(v).toLowerCase().includes(busq));
            const val = r[campo];
            return val && String(val).toLowerCase().includes(busq);
        });
    }
    renderTablaRdll();
    const cont = document.getElementById('contadorRdll');
    if (cont) cont.innerHTML = `📊 <strong>${datosRdllFiltrados.length}</strong> registros (de ${datosRdll.length} total)`;
}

function renderTablaRdll() {
    const tbody = document.getElementById('tbodyRdll');
    if (!tbody) return;
    
    if (datosRdllFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No hay registros</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    datosRdllFiltrados.forEach(r => {
        const tr = document.createElement('tr');
        
        // === FIX: Proteger contra valores no string ===
        let diagnostico = r.DIAGNOSTICO;
        if (diagnostico === undefined || diagnostico === null) diagnostico = '-';
        if (typeof diagnostico !== 'string') diagnostico = String(diagnostico);
        
        let nombre = r.NOMBRE;
        if (nombre === undefined || nombre === null) nombre = '-';
        if (typeof nombre !== 'string') nombre = String(nombre);
        
        let rut = r.RUT;
        if (rut === undefined || rut === null) rut = '-';
        if (typeof rut !== 'string') rut = String(rut);
        
        let telefono = r.TELEFONO;
        if (telefono === undefined || telefono === null) telefono = '-';
        if (typeof telefono !== 'string') telefono = String(telefono);
        
        let motivo = r['MOTIVO LLAMADO'];
        if (motivo === undefined || motivo === null) motivo = '-';
        if (typeof motivo !== 'string') motivo = String(motivo);
        
        let respuesta = r['RESPUESTA RECEPTOR'];
        if (respuesta === undefined || respuesta === null) respuesta = '-';
        if (typeof respuesta !== 'string') respuesta = String(respuesta);
        
        let funcionario = r.FUNCIONARIO;
        if (funcionario === undefined || funcionario === null) funcionario = '-';
        if (typeof funcionario !== 'string') funcionario = String(funcionario);
        
        tr.innerHTML = `
            <td>${formatDate(r.FECHA)}</td>
            <td><strong>${nombre.substring(0, 50)}</strong></td>
            <td>${rut}</td>
            <td style="max-width:200px;">${diagnostico.substring(0, 35)}${diagnostico.length > 35 ? '...' : ''}</td>
            <td>${telefono}</td>
            <td>${motivo}</td>
            <td>${respuesta}</td>
            <td>${formatDate(r['FECHA PROXIMO LLAMADO'])}</td>
            <td>${funcionario}</td>
            <td><button onclick="verDetalleRdll('${r.key}')" style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">👁️ Ver</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function verDetalleRdll(key) {
    const r = datosRdll.find(d => d.key === key);
    if (!r) return;
    let html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">';
    const campos = ['FECHA','NOMBRE','RUT','DIAGNOSTICO','TELEFONO','NOMBRE RECEPTOR','RUT RECEPTOR','PARENTESCO RECEPTOR','MOTIVO LLAMADO','RESPUESTA RECEPTOR','OBSERVACIONES','FECHA PROXIMO LLAMADO','FUNCIONARIO'];
    campos.forEach(c => {
        let val = r[c] || '-';
        if (c === 'FECHA' || c === 'FECHA PROXIMO LLAMADO') val = formatDate(val);
        html += `<p><strong>${c}:</strong><br>${val}</p>`;
    });
    html += '</div>';
    document.getElementById('modalRdllBody').innerHTML = html;
    
    const btnEditar = document.getElementById('btnEditarRdllModal');
    const btnEliminar = document.getElementById('btnEliminarRdllModal');
    if (currentUserRole === 'admin') {
        btnEditar.style.display = 'inline-block';
        btnEliminar.style.display = 'inline-block';
        btnEditar.setAttribute('onclick', `abrirEditarRdll('${key}')`);
        btnEliminar.setAttribute('onclick', `eliminarRdll('${key}')`);
    } else {
        btnEditar.style.display = 'none';
        btnEliminar.style.display = 'none';
    }
    document.getElementById('modalRdllDetalle').style.display = 'flex';
}

function cerrarModalRdllDetalle() { document.getElementById('modalRdllDetalle').style.display = 'none'; }

function limpiarFiltrosRdll() {
    document.getElementById('busquedaRdll').value = '';
    document.getElementById('campoFiltroRdll').value = 'todos';
    filtrarRdll();
}

function exportarRdllExcel() {
    if (datosRdllFiltrados.length === 0) { alert("No hay datos"); return; }
    const datos = datosRdllFiltrados.map(r => ({
        FECHA: r.FECHA || '', NOMBRE: r.NOMBRE || '', RUT: r.RUT || '', DIAGNOSTICO: r.DIAGNOSTICO || '',
        TELEFONO: r.TELEFONO || '', 'NOMBRE RECEPTOR': r['NOMBRE RECEPTOR'] || '', 'RUT RECEPTOR': r['RUT RECEPTOR'] || '',
        'PARENTESCO RECEPTOR': r['PARENTESCO RECEPTOR'] || '', 'MOTIVO LLAMADO': r['MOTIVO LLAMADO'] || '',
        'RESPUESTA RECEPTOR': r['RESPUESTA RECEPTOR'] || '', OBSERVACIONES: r.OBSERVACIONES || '',
        'FECHA PROXIMO LLAMADO': r['FECHA PROXIMO LLAMADO'] || '', FUNCIONARIO: r.FUNCIONARIO || ''
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historico_RDLL');
    XLSX.writeFile(wb, `Historico_RDLL_${new Date().toISOString().slice(0,10)}.xlsx`);
    alert("✅ Exportado");
}

function abrirNuevoRdll() {
    editandoRdllKey = null;
    document.getElementById('tituloRdllForm').textContent = '✏️ Nuevo Registro RDLL';
    document.getElementById('formRdll').reset();
    document.getElementById('rdll_key').value = '';
    document.getElementById('rdll_fecha').value = new Date().toISOString().split('T')[0];
    if (currentUser) document.getElementById('rdll_funcionario').value = currentUser.email;
    document.getElementById('modalRdllForm').style.display = 'flex';

    // ========== VALIDACIÓN EN TIEMPO REAL PARA RDLL ==========
    // Validar RUT del paciente
    const rutPaciente = document.getElementById('rdll_rut');
    if (rutPaciente) {
        const nuevoRutPaciente = rutPaciente.cloneNode(true);
        rutPaciente.parentNode.replaceChild(nuevoRutPaciente, rutPaciente);
        
        nuevoRutPaciente.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (!rutLimpio || !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            }
        });
        
        nuevoRutPaciente.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    
    // Validar RUT del receptor
    const rutReceptor = document.getElementById('rdll_rut_receptor');
    if (rutReceptor) {
        const nuevoRutReceptor = rutReceptor.cloneNode(true);
        rutReceptor.parentNode.replaceChild(nuevoRutReceptor, rutReceptor);
        
        nuevoRutReceptor.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (rut && !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else if (rut && validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
            }
        });
        
        nuevoRutReceptor.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    // =========================================================
}

function cerrarModalRdllForm() { document.getElementById('modalRdllForm').style.display = 'none'; }

async function abrirEditarRdll(key) {
    if (currentUserRole !== 'admin') { alert("Solo administradores"); return; }
    cerrarModalRdllDetalle();
    const r = datosRdll.find(d => d.key === key);
    if (!r) return;
    editandoRdllKey = key;
    document.getElementById('tituloRdllForm').textContent = '✏️ Editar Registro RDLL';
    document.getElementById('rdll_key').value = key;
    
    let fechaVal = '', proxVal = '';
    if (r.FECHA) {
        const partes = String(r.FECHA).split(/[-:\s]/);
        if (partes.length >= 3) fechaVal = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    if (r['FECHA PROXIMO LLAMADO']) {
        const partes = String(r['FECHA PROXIMO LLAMADO']).split(/[-:\s]/);
        if (partes.length >= 3) proxVal = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    
    document.getElementById('rdll_fecha').value = fechaVal;
    document.getElementById('rdll_nombre').value = r.NOMBRE || '';
    document.getElementById('rdll_rut').value = r.RUT || '';
    document.getElementById('rdll_diagnostico').value = r.DIAGNOSTICO || '';
    document.getElementById('rdll_telefono').value = r.TELEFONO || '';
    document.getElementById('rdll_nombre_receptor').value = r['NOMBRE RECEPTOR'] || '';
    document.getElementById('rdll_rut_receptor').value = r['RUT RECEPTOR'] || '';
    document.getElementById('rdll_parentesco').value = r['PARENTESCO RECEPTOR'] || '';
    document.getElementById('rdll_motivo').value = r['MOTIVO LLAMADO'] || '';
    document.getElementById('rdll_respuesta').value = r['RESPUESTA RECEPTOR'] || '';
    document.getElementById('rdll_observaciones').value = r.OBSERVACIONES || '';
    document.getElementById('rdll_proximo_llamado').value = proxVal;
    document.getElementById('rdll_funcionario').value = r.FUNCIONARIO || currentUser?.email || '';
    document.getElementById('modalRdllForm').style.display = 'flex';

    // ========== VALIDACIÓN EN TIEMPO REAL PARA RDLL (EDITAR) ==========
    // Validar RUT del paciente
    const rutPaciente = document.getElementById('rdll_rut');
    if (rutPaciente) {
        const nuevoRutPaciente = rutPaciente.cloneNode(true);
        rutPaciente.parentNode.replaceChild(nuevoRutPaciente, rutPaciente);
        
        nuevoRutPaciente.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (!rutLimpio || !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            }
        });
        
        nuevoRutPaciente.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    
    // Validar RUT del receptor
    const rutReceptor = document.getElementById('rdll_rut_receptor');
    if (rutReceptor) {
        const nuevoRutReceptor = rutReceptor.cloneNode(true);
        rutReceptor.parentNode.replaceChild(nuevoRutReceptor, rutReceptor);
        
        nuevoRutReceptor.addEventListener('blur', function() {
            const rut = this.value;
            const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
            
            let msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
            
            if (rut && !validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#ef4444';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '❌ RUT inválido';
                this.parentNode.appendChild(msg);
            } else if (rut && validarRutChileno(rutLimpio)) {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                msg = document.createElement('small');
                msg.className = 'rut-msg';
                msg.style.color = '#10b981';
                msg.style.display = 'block';
                msg.style.marginTop = '4px';
                msg.textContent = '✅ RUT válido';
                this.parentNode.appendChild(msg);
            } else {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
            }
        });
        
        nuevoRutReceptor.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const msg = this.nextElementSibling;
            if (msg && msg.classList && msg.classList.contains('rut-msg')) {
                msg.remove();
            }
        });
    }
    // =========================================================
}

async function eliminarRdll(key) {
    if (currentUserRole !== 'admin') { alert("Solo administradores"); return; }
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';
    try {
        await db.ref(`${RDLL_PATH}/${key}`).remove();
        alert("✅ Registro eliminado");
        cerrarModalRdllDetalle();
        await cargarRdll();
    } catch (e) { alert("Error: " + e.message); }
    finally { if (loading) loading.style.display = 'none'; }
}

// ====================== SUBMIT FORMULARIO RDLL ======================
let isSubmittingRdll = false;   // ← Protección contra doble envío

document.getElementById('formRdll')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // === BLOQUEO CONTRA DOBLE CLIC ===
    if (isSubmittingRdll) {
        console.log("Envío RDLL ya en progreso...");
        return;
    }
    isSubmittingRdll = true;

    const key = document.getElementById('rdll_key').value;
    
    function formatearFechaGuardar(val) {
        if (!val) return '';
        if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [a, m, d] = val.split('-');
            return `${d}-${m}-${a} 00:00:00`;
        }
        return val;
    }
    
// ========== FORMATEAR Y VALIDAR RUTS ==========
const rutPaciente = document.getElementById('rdll_rut').value;
const rutReceptor = document.getElementById('rdll_rut_receptor').value;

// PASO 1: Limpiar RUTs (quitar puntos, guiones y espacios) para validar
const rutPacienteLimpio = rutPaciente ? rutPaciente.replace(/[^0-9kK]/g, '').toUpperCase() : '';
const rutReceptorLimpio = rutReceptor ? rutReceptor.replace(/[^0-9kK]/g, '').toUpperCase() : '';

// PASO 2: Validar RUT del paciente (obligatorio)
if (!rutPacienteLimpio || !validarRutChileno(rutPacienteLimpio)) {
    alert("❌ El RUT del paciente es obligatorio y debe ser válido.");
    document.getElementById('rdll_rut').focus();
    isSubmittingRdll = false;
    if (loading) loading.style.display = 'none';
    return;
}

// PASO 3: Validar RUT del receptor (opcional - solo si se ingresó)
if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
    alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
    document.getElementById('rdll_rut_receptor').focus();
    isSubmittingRdll = false;
    if (loading) loading.style.display = 'none';
    return;
}

// PASO 4: Formatear RUTs
const rutPacienteFormateado = formatRut(rutPacienteLimpio);
const rutReceptorFormateado = rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '';


// =============================================

const data = {
    FECHA: formatearFechaGuardar(document.getElementById('rdll_fecha').value),
    NOMBRE: document.getElementById('rdll_nombre').value.toUpperCase().trim(),
    RUT: rutPacienteFormateado,
    DIAGNOSTICO: document.getElementById('rdll_diagnostico').value,
    TELEFONO: document.getElementById('rdll_telefono').value,
    'NOMBRE RECEPTOR': document.getElementById('rdll_nombre_receptor').value.toUpperCase().trim(),
    'RUT RECEPTOR': rutReceptorFormateado,
    'PARENTESCO RECEPTOR': document.getElementById('rdll_parentesco').value.toUpperCase().trim(),
    'MOTIVO LLAMADO': document.getElementById('rdll_motivo').value,
    'RESPUESTA RECEPTOR': document.getElementById('rdll_respuesta').value,
    OBSERVACIONES: document.getElementById('rdll_observaciones').value,
    'FECHA PROXIMO LLAMADO': formatearFechaGuardar(document.getElementById('rdll_proximo_llamado').value),
    FUNCIONARIO: document.getElementById('rdll_funcionario').value || currentUser?.email,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    creadoPor: currentUser?.email || 'Sistema'
};
    
    if (!data.FECHA || !data.NOMBRE || !data.RUT || !data.DIAGNOSTICO || 
        !data['MOTIVO LLAMADO'] || !data['RESPUESTA RECEPTOR']) {
        alert("❌ Complete los campos obligatorios");
        isSubmittingRdll = false;
        return;
    }

    // ========== VALIDAR RUT ==========
if (data.RUT && !validarRutChileno(data.RUT)) {
    alert("❌ El RUT ingresado no es válido. Por favor verifica el formato.");
    isSubmittingRdll = false;
    return;
}
    
    const loading = document.getElementById('loadingModal');
    if (loading) loading.style.display = 'flex';

    try {
        if (key) {
            await db.ref(`${RDLL_PATH}/${key}`).update(data);
            alert("✅ Registro actualizado correctamente");
        } else {
            await db.ref(RDLL_PATH).push(data);
            alert("✅ Registro guardado correctamente");
        }

        cerrarModalRdllForm();
        await cargarRdll();

    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    } finally {
        isSubmittingRdll = false;
        if (loading) loading.style.display = 'none';
    }
});

// Inicializar eventos y carga
document.getElementById('btnNuevoRegistroRdll')?.addEventListener('click', abrirNuevoRdll);
document.getElementById('btnCargarExcelRdll')?.addEventListener('click', () => {
    if (currentUserRole !== 'admin') { alert("Solo administradores"); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const loading = document.getElementById('loadingModal');
        if (loading) loading.style.display = 'flex';
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            if (rows.length === 0) { alert("Archivo vacío"); return; }
            
            for (const row of rows) {
                const registro = {
                    FECHA: row.FECHA || row.fecha || '',
                    NOMBRE: (row.NOMBRE || row.nombre || '').toUpperCase(),
                    RUT: row.RUT || row.rut || '',
                    DIAGNOSTICO: row.DIAGNOSTICO || row.diagnostico || '',
                    TELEFONO: row.TELEFONO || row.telefono || '',
                    'NOMBRE RECEPTOR': (row['NOMBRE RECEPTOR'] || row.nombre_receptor || '').toUpperCase(),
                    'RUT RECEPTOR': row['RUT RECEPTOR'] || row.rut_receptor || '',
                    'PARENTESCO RECEPTOR': (row['PARENTESCO RECEPTOR'] || row.parentesco || '').toUpperCase(),
                    'MOTIVO LLAMADO': row['MOTIVO LLAMADO'] || row.motivo || '',
                    'RESPUESTA RECEPTOR': row['RESPUESTA RECEPTOR'] || row.respuesta || '',
                    OBSERVACIONES: row.OBSERVACIONES || row.observaciones || '',
                    'FECHA PROXIMO LLAMADO': row['FECHA PROXIMO LLAMADO'] || row.proximo_llamado || '',
                    FUNCIONARIO: row.FUNCIONARIO || row.funcionario || currentUser?.email || 'Sistema',
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    creadoPor: currentUser?.email || 'Sistema'
                };
                await db.ref(RDLL_PATH).push(registro);
            }
            alert(`✅ Cargados ${rows.length} registros`);
            await cargarRdll();
        } catch (err) { alert("Error: " + err.message); }
        finally { if (loading) loading.style.display = 'none'; }
    };
    input.click();
});


// ====================== CALCULAR PERCENTILES CON RANGOS EXCLUYENTES ======================
// ====================== CALCULAR PERCENTILES CON RANGOS EXCLUYENTES ======================
function calcularEstadisticasEspera(diasEspera, totalPacientes) {
    if (diasEspera.length === 0) {
        return {
            p25: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p50: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p75: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p90: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            resto: { min: 0, max: 0, pacientes: 0, porcentaje: 0 }
        };
    }
    
    const sorted = [...diasEspera].sort((a, b) => a - b);
    const n = sorted.length;
    
    const getPercentil = (p) => {
        const index = Math.floor(p * (n - 1));
        return sorted[index];
    };
    
    const valorP25 = getPercentil(0.25);
    const valorP50 = getPercentil(0.50);
    const valorP75 = getPercentil(0.75);
    const valorP90 = getPercentil(0.90);
    
    // Contar pacientes en cada rango EXCLUYENTE
    const pacientesP25 = sorted.filter(d => d <= valorP25).length;
    const pacientesP50 = sorted.filter(d => d > valorP25 && d <= valorP50).length;
    const pacientesP75 = sorted.filter(d => d > valorP50 && d <= valorP75).length;
    const pacientesP90 = sorted.filter(d => d > valorP75 && d <= valorP90).length;
    const pacientesResto = sorted.filter(d => d > valorP90).length;
    
    return {
        p25: {
            valor: valorP25,
            min: 0,
            max: valorP25,
            pacientes: pacientesP25,
            porcentaje: ((pacientesP25 / totalPacientes) * 100).toFixed(1)
        },
        p50: {
            valor: valorP50,
            min: valorP25 + 1,
            max: valorP50,
            pacientes: pacientesP50,
            porcentaje: ((pacientesP50 / totalPacientes) * 100).toFixed(1)
        },
        p75: {
            valor: valorP75,
            min: valorP50 + 1,
            max: valorP75,
            pacientes: pacientesP75,
            porcentaje: ((pacientesP75 / totalPacientes) * 100).toFixed(1)
        },
        p90: {
            valor: valorP90,
            min: valorP75 + 1,
            max: valorP90,
            pacientes: pacientesP90,
            porcentaje: ((pacientesP90 / totalPacientes) * 100).toFixed(1)
        },
        resto: {
            min: valorP90 + 1,
            max: sorted[sorted.length - 1],
            pacientes: pacientesResto,
            porcentaje: ((pacientesResto / totalPacientes) * 100).toFixed(1)
        }
    };
}



function getDiasEspera(patient, tipo = 'lista') {
    if (tipo === 'dashboard') {
        if (fuentePercentilDashboard === 'fechaEstatusProgram') {
            return calculateWaitingDays(patient.fechaEstatusProgram);
        } else {
            return calculateWaitingDays(patient.fechaIndQx);
        }
    } else {
        if (fuentePercentilLista === 'fechaEstatusProgram') {
            return calculateWaitingDays(patient.fechaEstatusProgram);
        } else {
            return calculateWaitingDays(patient.fechaIndQx);
        }
    }
}

// ====================== CAMBIAR FUENTE DEL DASHBOARD ======================
function cambiarFuenteDashboard(fuente) {
    fuentePercentilDashboard = fuente;
    
    // Sincronizar solo los radios del Dashboard
    const radioIndQx = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaIndQx"]');
    const radioEstatus = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaEstatusProgram"]');
    
    if (radioIndQx && radioEstatus) {
        radioIndQx.checked = (fuente === 'fechaIndQx');
        radioEstatus.checked = (fuente === 'fechaEstatusProgram');
    }
    
    // Actualizar solo el Dashboard
    updateDashboard();
    
    console.log(`Dashboard: Fuente cambiada a: ${fuente === 'fechaIndQx' ? 'Fecha Indicación Qx' : 'Fecha Estatus Programable'}`);
}

// ====================== CAMBIAR FUENTE DE LA LISTA DE PACIENTES ======================
function cambiarFuenteLista(fuente) {
    fuentePercentilLista = fuente;
    
    // Sincronizar solo el select de la lista
    const selectLista = document.getElementById('fuentePercentilLista');
    if (selectLista) selectLista.value = fuente;
    
    // Actualizar la lista de pacientes
    renderPatientsTable(patients);
    if (filtroPercentil) filterPatients();
    
    console.log(`Lista: Fuente cambiada a: ${fuente === 'fechaIndQx' ? 'Fecha Indicación Qx' : 'Fecha Estatus Programable'}`);

    guardarFiltrosEnStorage();
}



// ====================== RESTAURACIÓN SEGURA Y DEFINITIVA ======================
function restaurarFiltrosSeguro() {
    if (!lastFilters) {
        console.warn("⚠️ lastFilters no inicializado");
        return;
    }

    // Usamos un delay mayor y verificamos que los elementos clave existan
    setTimeout(() => {
        // 1. Restaurar campos
        const campos = ['busquedaGeneral', 'filterEspecialidad', 'filterMedico', 
                       'filterEstatus', 'filterComuna', 'filterFechaDesde', 
                       'filterFechaHasta', 'filterPercentil'];
        
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = lastFilters[id] || '';
        });

        // 2. Variables globales
        soloSinFolio = !!lastFilters.soloSinFolio;
        mostrarDuplicados = !!lastFilters.mostrarDuplicados;
        soloSinProgramacion = !!lastFilters.soloSinProgramacion;
        filtroPercentil = lastFilters.filtroPercentil || '';

        fuentePercentilDashboard = lastFilters.fuentePercentilDashboard || 'fechaIndQx';
        fuentePercentilLista = lastFilters.fuentePercentilLista || 'fechaIndQx';

        // 3. Sincronizar UI
        const radioInd = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaIndQx"]');
        const radioEst = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaEstatusProgram"]');
        const selectLista = document.getElementById('fuentePercentilLista');

        if (radioInd) radioInd.checked = (fuentePercentilDashboard === 'fechaIndQx');
        if (radioEst) radioEst.checked = (fuentePercentilDashboard === 'fechaEstatusProgram');
        if (selectLista) selectLista.value = fuentePercentilLista;

        // 4. Actualizar botones
        actualizarBotonesFiltrosVisuales();

        // 5. Aplicar filtros (con pequeño delay extra)
        setTimeout(() => {
            filterPatients();
            console.log("✅ Filtros restaurados correctamente para este usuario");
        }, 100);

    }, 450);
}

// ====================== GESTIÓN DE FILTROS CON LOCALSTORAGE ======================

let lastFilters = {
    busquedaGeneral: '',
    filterEspecialidad: '',
    filterMedico: '',
    filterEstatus: '',
    filterPrioridad: '',
    filterGes: '',
    filterComuna: '',
    filterFechaDesde: '',
    filterFechaHasta: '',
    soloSinFolio: false,
    mostrarDuplicados: false,
    soloSinProgramacion: false,
    ocultarNoGestionables: false, 
    filtroPercentil: '',
    fuentePercentilDashboard: 'fechaIndQx',
    fuentePercentilLista: 'fechaIndQx'
};

// Cargar filtros guardados desde localStorage
function cargarFiltrosDesdeStorage() {
    const saved = localStorage.getItem('prequirurgico_filtros');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(lastFilters, parsed);
        
        soloSinFolio = !!lastFilters.soloSinFolio;
        mostrarDuplicados = !!lastFilters.mostrarDuplicados;
        soloSinProgramacion = !!lastFilters.soloSinProgramacion;
         ocultarNoGestionables = !!lastFilters.ocultarNoGestionables;
        filtroPercentil = lastFilters.filtroPercentil || '';
        
        fuentePercentilLista = lastFilters.fuentePercentilLista || 'fechaIndQx';
    }
}

// Guardar filtros en localStorage
function guardarFiltrosEnStorage() {
    lastFilters = {
        busquedaGeneral: document.getElementById('busquedaGeneral')?.value?.trim() || '',
        filterEspecialidad: document.getElementById('filterEspecialidad')?.value || '',
        filterMedico: document.getElementById('filterMedico')?.value || '',
        filterEstatus: document.getElementById('filterEstatus')?.value || '',
        filterPrioridad: document.getElementById('filterPrioridad')?.value || '',
         filterGes: document.getElementById('filterGes')?.value || '', 
        filterComuna: document.getElementById('filterComuna')?.value || '',
        filterFechaDesde: document.getElementById('filterFechaDesde')?.value || '',
        filterFechaHasta: document.getElementById('filterFechaHasta')?.value || '',
        soloSinFolio: !!soloSinFolio,
        mostrarDuplicados: !!mostrarDuplicados,
        soloSinProgramacion: !!soloSinProgramacion,
        ocultarNoGestionables: !!ocultarNoGestionables,
        filtroPercentil: filtroPercentil || '',
      
        fuentePercentilLista: fuentePercentilLista || 'fechaIndQx'
    };
    localStorage.setItem('prequirurgico_filtros', JSON.stringify(lastFilters));
}

// Restaurar filtros (usada por todos los usuarios)
function restaurarFiltros() {
    cargarFiltrosDesdeStorage();

    setTimeout(() => {
        const campos = ['busquedaGeneral', 'filterEspecialidad', 'filterMedico', 'filterEstatus', 'filterPrioridad', 'filterGes',
                       'filterComuna', 'filterFechaDesde', 'filterFechaHasta', 'filterPercentil'];

        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = lastFilters[id] || '';
        });

        // Sincronizar controles visuales
        const radioInd = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaIndQx"]');
        const radioEst = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaEstatusProgram"]');
        const selectLista = document.getElementById('fuentePercentilLista');

        if (radioInd) radioInd.checked = (fuentePercentilDashboard === 'fechaIndQx');
        if (radioEst) radioEst.checked = (fuentePercentilDashboard === 'fechaEstatusProgram');
        if (selectLista) selectLista.value = fuentePercentilLista;

        actualizarBotonesFiltrosVisuales();
        filterPatients();

        console.log("✅ Filtros restaurados desde localStorage");
    }, 400);
}


// ====================== VALIDACIÓN DE RUT EN TIEMPO REAL ======================
function setupRutValidation() {
    // Validar RUT en el formulario de nuevo paciente
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.addEventListener('blur', function() {
            const rut = this.value;
            if (rut && !validarRutChileno(rut)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fee2e2';
                // Mostrar mensaje de error
                let errorMsg = this.nextElementSibling;
                if (!errorMsg || !errorMsg.classList.contains('rut-error')) {
                    errorMsg = document.createElement('small');
                    errorMsg.className = 'rut-error';
                    errorMsg.style.color = '#ef4444';
                    errorMsg.style.display = 'block';
                    errorMsg.style.marginTop = '4px';
                    errorMsg.textContent = '❌ RUT inválido. Verifica el formato.';
                    this.parentNode.appendChild(errorMsg);
                }
            } else if (rut && validarRutChileno(rut)) {
                // RUT válido - indicador verde
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#ecfdf5';
                // Limpiar mensaje de error si existe
                const errorMsg = this.nextElementSibling;
                if (errorMsg && errorMsg.classList && errorMsg.classList.contains('rut-error')) {
                    errorMsg.remove();
                }
                // Mostrar indicador de válido
                let validMsg = this.nextElementSibling;
                if (!validMsg || !validMsg.classList.contains('rut-valid')) {
                    validMsg = document.createElement('small');
                    validMsg.className = 'rut-valid';
                    validMsg.style.color = '#10b981';
                    validMsg.style.display = 'block';
                    validMsg.style.marginTop = '4px';
                    validMsg.textContent = '✅ RUT válido';
                    this.parentNode.appendChild(validMsg);
                }
            } else {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
                const errorMsg = this.nextElementSibling;
                if (errorMsg && errorMsg.classList && errorMsg.classList.contains('rut-error')) {
                    errorMsg.remove();
                }
                const validMsg = this.nextElementSibling;
                if (validMsg && validMsg.classList && validMsg.classList.contains('rut-valid')) {
                    validMsg.remove();
                }
            }
        });
        
        // Limpiar validación al escribir
        rutInput.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
            const errorMsg = this.nextElementSibling;
            if (errorMsg && errorMsg.classList && errorMsg.classList.contains('rut-error')) {
                errorMsg.remove();
            }
            const validMsg = this.nextElementSibling;
            if (validMsg && validMsg.classList && validMsg.classList.contains('rut-valid')) {
                validMsg.remove();
            }
        });
    }
}

// ====================== OBTENER TEXTO DE FILTROS APLICADOS ======================
function obtenerTextoFiltros() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const ges = document.getElementById('filterGes')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';
    
    const filtros = [];
    if (busqueda) filtros.push(`🔍 Búsqueda: "${busqueda}"`);
    if (especialidad) filtros.push(`🏥 Especialidad: ${especialidad}`);
    if (medico) filtros.push(`👨‍⚕️ Médico: ${medico}`);
    if (estatus) filtros.push(`📊 Estatus: ${estatus}`);
    if (prioridad) filtros.push(`⚠️ Prioridad: ${prioridad}`);
    if (ges) filtros.push(`✅ GES: ${ges}`);
    if (comuna) filtros.push(`🏠 Comuna: ${comuna}`);
    if (fechaDesde) filtros.push(`📅 Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`📅 Hasta: ${fechaHasta}`);
    if (soloSinFolio) filtros.push(`📄 Solo sin folio`);
    if (soloSinProgramacion) filtros.push(`📅 Solo sin fecha programación`);
    if (ocultarNoGestionables) filtros.push(`🚫 Ocultando No Gestionables`);
    if (mostrarDuplicados) filtros.push(`🔄 Mostrando duplicados`);
    if (filtroPercentil) {
        const nombres = {
            'p25': 'Percentil 25 (≤ P25)',
            'p50': 'Percentil 50 (P25-P50)',
            'p75': 'Percentil 75 (P50-P75)',
            'p90': 'Percentil 90 (P75-P90)',
            'resto': 'Resto (> P90)'
        };
        filtros.push(`📊 ${nombres[filtroPercentil] || filtroPercentil}`);
    }
    
    return filtros.length > 0 ? filtros.join(' | ') : 'Ningún filtro aplicado';
}
