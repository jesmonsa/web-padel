// Configuración de la aplicación
const CONFIG = {
    apiUrl: 'http://localhost:3000/api',
    horarios: {
        inicio: 8,
        fin: 23,
        intervalo: 1
    },
    precios: {
        central: 25,
        norte: 20,
        sur: 15
    },
    storage: {
        reservasKey: 'padel_reservas',
        contadorKey: 'padel_contador',
        userKey: 'padel_user',
        tokenKey: 'padel_token'
    }
};

// Variables globales
let reservas = [];
let contadorReservas = 0;
let currentUser = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función principal de inicialización
async function initializeApp() {
    setupEventListeners();
    await loadReservasFromStorage(); // Ahora es async
    setupFechaMinima();
    displayReservas();
    setupMobileNavigation();
    
    // Cargar datos del backend
    initializeBackendData();
    
    // Inicializar autenticación
    initializeAuth();
}

// Configurar event listeners
function setupEventListeners() {
    const reservaForm = document.getElementById('reservaForm');
    if (reservaForm) {
        reservaForm.addEventListener('submit', handleReservaSubmit);
    }

    const pistaSelect = document.getElementById('pista');
    const duracionSelect = document.getElementById('duracion');
    const fechaInput = document.getElementById('fecha');

    if (pistaSelect) pistaSelect.addEventListener('change', updatePrecioTotal);
    if (duracionSelect) duracionSelect.addEventListener('change', updatePrecioTotal);
    if (fechaInput) fechaInput.addEventListener('change', updateHorariosDisponibles);

    const limpiarBtn = document.getElementById('limpiarReservas');
    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', limpiarTodasLasReservas);
    }

    setupModal();

    const contactoForm = document.getElementById('contactoForm');
    if (contactoForm) {
        contactoForm.addEventListener('submit', handleContactoSubmit);
    }

    setupSmoothScrolling();
}

// Configurar fecha mínima (hoy)
function setupFechaMinima() {
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
    }
}

// Actualizar horarios disponibles
function updateHorariosDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const pistaSelect = document.getElementById('pista');
    
    if (!fechaInput.value || !pistaSelect.value) return;

    horaSelect.innerHTML = '<option value="">Seleccionar hora</option>';

    const fechaSeleccionada = fechaInput.value;
    const pistaSeleccionada = pistaSelect.value;
    const horaActual = new Date().getHours();
    const fechaHoy = new Date().toISOString().split('T')[0];

    for (let hora = CONFIG.horarios.inicio; hora < CONFIG.horarios.fin; hora++) {
        if (fechaSeleccionada === fechaHoy && hora <= horaActual) {
            continue;
        }

        const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
        const isOcupada = isHoraOcupada(fechaSeleccionada, horaFormateada, pistaSeleccionada);
        
        const option = document.createElement('option');
        option.value = horaFormateada;
        option.textContent = horaFormateada;
        
        if (isOcupada) {
            option.disabled = true;
            option.classList.add('hora-ocupada');
            option.textContent += ' (Ocupada)';
        }
        
        horaSelect.appendChild(option);
    }
}

// Verificar si una hora está ocupada
function isHoraOcupada(fecha, hora, pista) {
    return reservas.some(reserva => 
        reserva.fecha === fecha && 
        reserva.pista === pista && 
        isHoraEnRango(hora, reserva.hora, parseFloat(reserva.duracion))
    );
}

// Verificar si una hora está en el rango de una reserva
function isHoraEnRango(horaConsulta, horaReserva, duracion) {
    const horaConsultaNum = parseInt(horaConsulta.split(':')[0]);
    const horaReservaNum = parseInt(horaReserva.split(':')[0]);
    
    return horaConsultaNum >= horaReservaNum && 
           horaConsultaNum < (horaReservaNum + duracion);
}

// Actualizar precio total
function updatePrecioTotal() {
    const pistaSelect = document.getElementById('pista');
    const duracionSelect = document.getElementById('duracion');
    const precioTotalElement = document.getElementById('precioTotal');
    
    if (pistaSelect.value && duracionSelect.value) {
        const precioPorHora = CONFIG.precios[pistaSelect.value];
        const duracion = parseFloat(duracionSelect.value);
        const total = precioPorHora * duracion;
        
        precioTotalElement.textContent = `${total}€`;
    } else {
        precioTotalElement.textContent = '0€';
    }
}

// Manejar envío del formulario de reserva
function handleReservaSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const nombre = formData.get('nombre');
    const email = formData.get('email');
    const telefono = formData.get('telefono');
    const pista = formData.get('pista');
    const fecha = formData.get('fecha');
    const hora = formData.get('hora');
    const duracion = formData.get('duracion');
    
    if (!nombre || !email || !pista || !fecha || !hora) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    const reservaData = {
        id: ++contadorReservas,
        nombre: nombre,
        email: email,
        telefono: telefono,
        pista: pista,
        fecha: fecha,
        hora: hora,
        duracion: duracion,
        precio: calcularPrecio(pista, parseFloat(duracion)),
        fechaCreacion: new Date().toISOString()
    };

    if (isHoraOcupada(reservaData.fecha, reservaData.hora, reservaData.pista)) {
        alert('Lo sentimos, esa hora ya está ocupada. Por favor selecciona otra hora.');
        return;
    }

    // Intentar guardar en el backend primero
    const fechaCompleta = new Date(`${fecha}T${hora}:00`);
    
    saveReservaToBackend({
        usuario: nombre,
        email: email,
        telefono: telefono,
        pista: pista,
        fecha: fechaCompleta.toISOString(),
        duracion: parseFloat(duracion),
        precio: reservaData.precio
    }).then(() => {
        console.log('✅ Reserva guardada en MongoDB');
        // Guardar también localmente
        reservas.push(reservaData);
        saveReservasToStorage();
        displayReservas();
        showConfirmacionModal(reservaData);
        e.target.reset();
        updatePrecioTotal();
    }).catch((error) => {
        console.error('❌ Error guardando en backend:', error);
        alert('Error al conectar con el servidor. La reserva se guardará solo localmente.');
        
        // Fallback: guardar solo localmente
        reservas.push(reservaData);
        saveReservasToStorage();
        displayReservas();
        showConfirmacionModal(reservaData);
        e.target.reset();
        updatePrecioTotal();
    });
}

// Calcular precio total
function calcularPrecio(pista, duracion) {
    return CONFIG.precios[pista] * duracion;
}

// Guardar reservas en localStorage
function saveReservasToStorage() {
    localStorage.setItem(CONFIG.storage.reservasKey, JSON.stringify(reservas));
    localStorage.setItem(CONFIG.storage.contadorKey, contadorReservas.toString());
}

// Cargar reservas desde MongoDB y localStorage como fallback
async function loadReservasFromStorage() {
    try {
        console.log('🔄 Cargando reservas desde MongoDB...');
        
        // Intentar cargar desde MongoDB primero
        const reservasFromBackend = await fetchFromAPI('/reservas');
        console.log('📦 Reservas desde MongoDB:', reservasFromBackend);
        
        if (reservasFromBackend && (reservasFromBackend.data || reservasFromBackend.length)) {
            const reservasBackend = reservasFromBackend.data || reservasFromBackend;
            
            // Convertir formato de MongoDB al formato del frontend
            reservas = reservasBackend.map((reserva, index) => ({
                id: reserva._id || (index + 1),
                nombre: reserva.usuario || 'Usuario desconocido',
                email: reserva.email || '',
                telefono: reserva.telefono || '',
                pista: reserva.pista || '',
                fecha: reserva.fecha ? new Date(reserva.fecha).toLocaleDateString('es-ES') : '',
                hora: reserva.fecha ? new Date(reserva.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
                duracion: reserva.duracion || 1,
                precio: reserva.precio || 0,
                timestamp: reserva.fecha || new Date().toISOString(),
                estado: reserva.estado || 'pendiente',
                origen: 'mongodb' // Marcar origen
            }));
            
            console.log('✅ Reservas de MongoDB cargadas:', reservas.length);
            
            // También cargar las locales y combinarlas
            const reservasLocales = loadLocalReservas();
            if (reservasLocales.length > 0) {
                console.log('🔄 Combinando con reservas locales:', reservasLocales.length);
                reservas = [...reservas, ...reservasLocales];
            }
            
        } else {
            console.log('⚠️ No hay reservas en MongoDB, cargando solo locales');
            loadLocalReservas();
        }
        
    } catch (error) {
        console.error('❌ Error cargando reservas de MongoDB:', error);
        console.log('🔄 Fallback: Cargando solo reservas locales');
        loadLocalReservas();
    }
}

// Función helper para cargar solo reservas locales
function loadLocalReservas() {
    const reservasGuardadas = localStorage.getItem(CONFIG.storage.reservasKey);
    const contadorGuardado = localStorage.getItem(CONFIG.storage.contadorKey);
    
    let reservasLocales = [];
    
    if (reservasGuardadas) {
        reservasLocales = JSON.parse(reservasGuardadas);
        // Marcar como locales
        reservasLocales = reservasLocales.map(reserva => ({
            ...reserva,
            origen: 'local'
        }));
    }
    
    if (contadorGuardado) {
        contadorReservas = parseInt(contadorGuardado);
    }
    
    // Solo asignar si no hay reservas globales ya cargadas
    if (!reservas || reservas.length === 0) {
        reservas = reservasLocales;
    }
    
    return reservasLocales;
}

// Mostrar reservas en la interfaz
function displayReservas() {
    const reservasContainer = document.getElementById('reservasLista');
    if (!reservasContainer) return;
    
    if (reservas.length === 0) {
        reservasContainer.innerHTML = '<div class="no-reservas">No tienes reservas actualmente</div>';
        return;
    }
    
    const reservasOrdenadas = [...reservas].sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora}`);
        const fechaB = new Date(`${b.fecha}T${b.hora}`);
        return fechaA - fechaB;
    });
    
    reservasContainer.innerHTML = reservasOrdenadas.map(reserva => {
        const fechaFormateada = formatearFecha(reserva.fecha);
        const pistaFormateada = formatearPista(reserva.pista);
        const origenIcon = reserva.origen === 'mongodb' ? 
            '<i class="fas fa-cloud" title="Guardada en servidor"></i>' : 
            '<i class="fas fa-desktop" title="Solo local"></i>';
        const estadoBadge = reserva.estado ? 
            `<span class="estado-badge ${reserva.estado}">${reserva.estado}</span>` : '';
        
        return `
            <div class="reserva-item ${reserva.origen || 'local'}" data-id="${reserva.id}">
                <div class="reserva-header">
                    <div class="reserva-origen">
                        ${origenIcon}
                        ${estadoBadge}
                    </div>
                    <div class="reserva-actions">
                        ${currentUser ? `
                            <button class="edit-reserva" onclick="editarReserva('${reserva.id}')" title="Editar reserva">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-reserva" onclick="eliminarReserva('${reserva.id}')" title="Eliminar reserva">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button class="delete-reserva" onclick="eliminarReserva('${reserva.id}')" title="Eliminar reserva">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                    </div>
                </div>
                <h4>${pistaFormateada}</h4>
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                <p><strong>Hora:</strong> ${reserva.hora}</p>
                <p><strong>Duración:</strong> ${reserva.duracion} hora(s)</p>
                <p><strong>Cliente:</strong> ${reserva.nombre}</p>
                <p class="reserva-precio">Total: ${reserva.precio}€</p>
            </div>
        `;
    }).join('');
}

// Formatear fecha para mostrar
function formatearFecha(fecha) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', options);
}

// Formatear nombre de pista
function formatearPista(pista) {
    const nombres = {
        central: 'Pista Central',
        norte: 'Pista Norte',
        sur: 'Pista Sur'
    };
    return nombres[pista] || pista;
}

// Eliminar reserva individual
async function eliminarReserva(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
        return;
    }

    const reserva = reservas.find(r => r.id === id);
    if (!reserva) {
        alert('Reserva no encontrada');
        return;
    }

    // Si es una reserva de MongoDB y el usuario está logueado, usar API
    if (reserva.origen === 'mongodb' && currentUser) {
        try {
            const response = await authenticatedFetch(`${CONFIG.apiUrl}/reservas/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                // Eliminar de la lista local también
                reservas = reservas.filter(r => r.id !== id);
                saveReservasToStorage();
                displayReservas();
                updateHorariosDisponibles();
                alert('Reserva eliminada exitosamente del servidor');
            } else {
                alert(result.error || 'Error eliminando la reserva del servidor');
            }
        } catch (error) {
            console.error('Error eliminando reserva:', error);
            alert('Error de conexión. La reserva se eliminará solo localmente.');
            // Fallback: eliminar solo localmente
            reservas = reservas.filter(r => r.id !== id);
            saveReservasToStorage();
            displayReservas();
            updateHorariosDisponibles();
        }
    } else {
        // Reserva local o usuario no logueado
        reservas = reservas.filter(r => r.id !== id);
        saveReservasToStorage();
        displayReservas();
        updateHorariosDisponibles();
    }
}

// Editar reserva
function editarReserva(id) {
    if (!currentUser) {
        alert('Debes iniciar sesión para editar reservas');
        return;
    }

    const reserva = reservas.find(r => r.id === id);
    if (!reserva) {
        alert('Reserva no encontrada');
        return;
    }

    // Solo permitir editar reservas propias (MongoDB) o locales
    if (reserva.origen === 'mongodb' && reserva.email !== currentUser.email) {
        alert('Solo puedes editar tus propias reservas');
        return;
    }

    openEditReservaModal(reserva);
}

// Abrir modal de edición de reserva
function openEditReservaModal(reserva) {
    // Crear modal dinámicamente si no existe
    let editModal = document.getElementById('editReservaModal');
    
    if (!editModal) {
        editModal = createEditReservaModal();
        document.body.appendChild(editModal);
    }

    // Poblar formulario con datos actuales
    document.getElementById('editReservaId').value = reserva.id;
    document.getElementById('editPista').value = reserva.pista.toLowerCase();
    
    // Convertir fecha al formato requerido por input date
    const fechaInput = document.getElementById('editFecha');
    if (reserva.timestamp) {
        const fecha = new Date(reserva.timestamp);
        fechaInput.value = fecha.toISOString().split('T')[0];
    } else {
        // Parsear desde formato DD/MM/YYYY
        const fechaParts = reserva.fecha.split('/');
        if (fechaParts.length === 3) {
            const fecha = new Date(fechaParts[2], fechaParts[1] - 1, fechaParts[0]);
            fechaInput.value = fecha.toISOString().split('T')[0];
        }
    }
    
    document.getElementById('editHora').value = reserva.hora;
    document.getElementById('editDuracion').value = reserva.duracion;
    
    // Calcular precio actual
    updateEditPrecioTotal();
    
    // Mostrar modal
    editModal.classList.add('active');
    editModal.style.display = 'flex';
}

// Crear modal de edición
function createEditReservaModal() {
    const modal = document.createElement('div');
    modal.id = 'editReservaModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-edit"></i> Editar Reserva</h2>
                <span class="close" onclick="closeEditReservaModal()">&times;</span>
            </div>
            <form id="editReservaForm" class="auth-form">
                <input type="hidden" id="editReservaId">
                
                <div class="form-group">
                    <label for="editPista">
                        <i class="fas fa-map-marker-alt"></i> Pista
                    </label>
                    <select id="editPista" required>
                        <option value="">Seleccionar pista</option>
                        <option value="central">Pista Central - 25€/hora</option>
                        <option value="norte">Pista Norte - 20€/hora</option>
                        <option value="sur">Pista Sur - 15€/hora</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="editFecha">
                            <i class="fas fa-calendar"></i> Fecha
                        </label>
                        <input type="date" id="editFecha" required>
                    </div>
                    <div class="form-group">
                        <label for="editHora">
                            <i class="fas fa-clock"></i> Hora
                        </label>
                        <select id="editHora" required>
                            <option value="">Seleccionar hora</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="editDuracion">
                        <i class="fas fa-stopwatch"></i> Duración
                    </label>
                    <select id="editDuracion" required>
                        <option value="">Seleccionar duración</option>
                        <option value="1">1 hora</option>
                        <option value="1.5">1.5 horas</option>
                        <option value="2">2 horas</option>
                    </select>
                </div>
                
                <div class="precio-total">
                    <h4>Total: <span id="editPrecioTotal">0€</span></h4>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                    <button type="button" class="cancel-btn" onclick="closeEditReservaModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
                
                <div id="editError" class="error-message" style="display: none;"></div>
                <div id="editSuccess" class="success-message" style="display: none;"></div>
            </form>
        </div>
    `;

    // Agregar event listeners
    modal.querySelector('#editReservaForm').addEventListener('submit', handleEditReservaSubmit);
    modal.querySelector('#editPista').addEventListener('change', () => {
        updateEditHorariosDisponibles();
        updateEditPrecioTotal();
    });
    modal.querySelector('#editFecha').addEventListener('change', updateEditHorariosDisponibles);
    modal.querySelector('#editDuracion').addEventListener('change', updateEditPrecioTotal);

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditReservaModal();
        }
    });

    return modal;
}

// Cerrar modal de edición
function closeEditReservaModal() {
    const editModal = document.getElementById('editReservaModal');
    if (editModal) {
        editModal.classList.remove('active');
        setTimeout(() => {
            editModal.style.display = 'none';
        }, 300);
        
        // Limpiar formulario
        editModal.querySelector('form').reset();
        clearEditMessages();
    }
}

// Limpiar mensajes del modal de edición
function clearEditMessages() {
    const errorMsg = document.getElementById('editError');
    const successMsg = document.getElementById('editSuccess');
    
    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
    if (successMsg) {
        successMsg.style.display = 'none';
        successMsg.textContent = '';
    }
}

// Mostrar error en modal de edición
function showEditError(message) {
    const errorMsg = document.getElementById('editError');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}

// Mostrar éxito en modal de edición
function showEditSuccess(message) {
    const successMsg = document.getElementById('editSuccess');
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
}

// Actualizar horarios disponibles en modal de edición
function updateEditHorariosDisponibles() {
    const fechaInput = document.getElementById('editFecha');
    const horaSelect = document.getElementById('editHora');
    const pistaSelect = document.getElementById('editPista');
    const reservaId = document.getElementById('editReservaId').value;
    
    if (!fechaInput.value || !pistaSelect.value) return;

    horaSelect.innerHTML = '<option value="">Seleccionar hora</option>';

    const fechaSeleccionada = fechaInput.value;
    const pistaSeleccionada = pistaSelect.value;
    const horaActual = new Date().getHours();
    const fechaHoy = new Date().toISOString().split('T')[0];

    for (let hora = CONFIG.horarios.inicio; hora < CONFIG.horarios.fin; hora++) {
        if (fechaSeleccionada === fechaHoy && hora <= horaActual) {
            continue;
        }

        const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
        
        // Verificar disponibilidad excluyendo la reserva actual
        const isOcupada = reservas.some(reserva => 
            reserva.id !== reservaId &&
            reserva.fecha === fechaSeleccionada && 
            reserva.pista === pistaSeleccionada && 
            isHoraEnRango(horaFormateada, reserva.hora, parseFloat(reserva.duracion))
        );
        
        const option = document.createElement('option');
        option.value = horaFormateada;
        option.textContent = horaFormateada;
        
        if (isOcupada) {
            option.disabled = true;
            option.classList.add('hora-ocupada');
            option.textContent += ' (Ocupada)';
        }
        
        horaSelect.appendChild(option);
    }
}

// Actualizar precio total en modal de edición
function updateEditPrecioTotal() {
    const pistaSelect = document.getElementById('editPista');
    const duracionSelect = document.getElementById('editDuracion');
    const precioTotalElement = document.getElementById('editPrecioTotal');
    
    if (pistaSelect.value && duracionSelect.value) {
        const precioPorHora = CONFIG.precios[pistaSelect.value];
        const duracion = parseFloat(duracionSelect.value);
        const total = precioPorHora * duracion;
        
        precioTotalElement.textContent = `${total}€`;
    } else {
        precioTotalElement.textContent = '0€';
    }
}

// Manejar envío de formulario de edición
async function handleEditReservaSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const reservaId = document.getElementById('editReservaId').value;
    
    const formData = {
        pista: document.getElementById('editPista').value,
        fecha: document.getElementById('editFecha').value,
        hora: document.getElementById('editHora').value,
        duracion: document.getElementById('editDuracion').value
    };
    
    // Validaciones
    if (!formData.pista || !formData.fecha || !formData.hora || !formData.duracion) {
        showEditError('Por favor completa todos los campos');
        return;
    }
    
    // Verificar disponibilidad
    const fechaCompleta = `${formData.fecha}T${formData.hora}:00`;
    const isOcupada = reservas.some(reserva => 
        reserva.id !== reservaId &&
        reserva.fecha === formData.fecha && 
        reserva.pista === formData.pista && 
        isHoraEnRango(formData.hora, reserva.hora, parseFloat(reserva.duracion))
    );
    
    if (isOcupada) {
        showEditError('Esa hora ya está ocupada. Por favor selecciona otra hora.');
        return;
    }
    
    // Deshabilitar botón
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const reserva = reservas.find(r => r.id === reservaId);
        
        // Si es reserva de MongoDB, usar API
        if (reserva.origen === 'mongodb' && currentUser) {
            const response = await authenticatedFetch(`${CONFIG.apiUrl}/reservas/${reservaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pista: formData.pista,
                    fecha: fechaCompleta,
                    hora: formData.hora,
                    duracion: parseFloat(formData.duracion)
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Actualizar reserva local
                const index = reservas.findIndex(r => r.id === reservaId);
                if (index !== -1) {
                    reservas[index] = {
                        ...reservas[index],
                        pista: formData.pista,
                        fecha: formData.fecha,
                        hora: formData.hora,
                        duracion: formData.duracion,
                        precio: CONFIG.precios[formData.pista] * parseFloat(formData.duracion)
                    };
                }
                
                showEditSuccess('Reserva actualizada exitosamente');
                
                setTimeout(() => {
                    closeEditReservaModal();
                    displayReservas();
                    saveReservasToStorage();
                }, 1500);
                
            } else {
                showEditError(result.error || 'Error actualizando la reserva');
            }
            
        } else {
            // Reserva local
            const index = reservas.findIndex(r => r.id === reservaId);
            if (index !== -1) {
                reservas[index] = {
                    ...reservas[index],
                    pista: formData.pista,
                    fecha: formData.fecha,
                    hora: formData.hora,
                    duracion: formData.duracion,
                    precio: CONFIG.precios[formData.pista] * parseFloat(formData.duracion)
                };
                
                saveReservasToStorage();
                displayReservas();
                
                showEditSuccess('Reserva actualizada exitosamente');
                
                setTimeout(() => {
                    closeEditReservaModal();
                }, 1500);
            }
        }
        
    } catch (error) {
        console.error('Error actualizando reserva:', error);
        showEditError('Error de conexión. Inténtalo de nuevo.');
        
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    }
}

// Agregar estilos CSS para botones de edición
function addEditButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .reserva-actions {
            display: flex;
            gap: 5px;
        }
        
        .edit-reserva,
        .delete-reserva {
            background: none;
            border: none;
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            transition: background-color 0.3s ease;
        }
        
        .edit-reserva {
            color: var(--primary-color);
        }
        
        .edit-reserva:hover {
            background: rgba(0, 123, 191, 0.1);
        }
        
        .delete-reserva {
            color: var(--danger-color);
        }
        
        .delete-reserva:hover {
            background: rgba(231, 76, 60, 0.1);
        }
        
        .cancel-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: var(--border-radius);
            cursor: pointer;
            margin-left: 10px;
        }
        
        .cancel-btn:hover {
            background: #5a6268;
        }
        
        .precio-total {
            text-align: center;
            padding: 15px;
            background: var(--light-color);
            border-radius: var(--border-radius);
            margin: 15px 0;
        }
        
        .precio-total h4 {
            margin: 0;
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);
}

// Llamar función de estilos al inicializar
addEditButtonStyles();

// Limpiar todas las reservas
function limpiarTodasLasReservas() {
    if (reservas.length === 0) {
        alert('No hay reservas para eliminar.');
        return;
    }
    
    if (confirm('¿Estás seguro de que deseas eliminar TODAS las reservas? Esta acción no se puede deshacer.')) {
        reservas = [];
        contadorReservas = 0;
        saveReservasToStorage();
        displayReservas();
        updateHorariosDisponibles();
        alert('Todas las reservas han sido eliminadas.');
    }
}

// Mostrar modal de confirmación
function showConfirmacionModal(reservaData) {
    const modal = document.getElementById('confirmacionModal');
    const detallesDiv = document.getElementById('detallesReserva');
    
    if (!modal || !detallesDiv) return;
    
    const fechaFormateada = formatearFecha(reservaData.fecha);
    const pistaFormateada = formatearPista(reservaData.pista);
    
    detallesDiv.innerHTML = `
        <h4>Detalles de tu reserva:</h4>
        <p><strong>Cliente:</strong> ${reservaData.nombre}</p>
        <p><strong>Email:</strong> ${reservaData.email}</p>
        <p><strong>Teléfono:</strong> ${reservaData.telefono}</p>
        <p><strong>Pista:</strong> ${pistaFormateada}</p>
        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p><strong>Hora:</strong> ${reservaData.hora}</p>
        <p><strong>Duración:</strong> ${reservaData.duracion} hora(s)</p>
        <p><strong>Total a pagar:</strong> <span style="color: #f39c12; font-weight: bold;">${reservaData.precio}€</span></p>
    `;
    
    modal.style.display = 'block';
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('confirmacionModal');
    const closeBtn = modal?.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Manejar formulario de contacto
function handleContactoSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<div class="spinner"></div>Enviando...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        alert('¡Mensaje enviado correctamente! Te responderemos pronto.');
        e.target.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 2000);
}

// Configurar smooth scrolling
function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
            
            const navMenu = document.querySelector('.nav-menu');
            const hamburger = document.querySelector('.hamburger');
            if (navMenu && hamburger) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });
}

// Configurar navegación móvil
function setupMobileNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Auto-guardar cada 30 segundos
setInterval(() => {
    if (reservas.length > 0) {
        saveReservasToStorage();
    }
}, 30000);

// ======== FUNCIONES DE API ========

// Función para hacer peticiones al backend
async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${CONFIG.apiUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// Cargar artículos desde el backend
async function loadArticulos() {
    try {
        console.log('🔄 Cargando artículos...');
        const articulosData = await fetchFromAPI('/articulos');
        console.log('📦 Respuesta artículos:', articulosData);
        
        if (articulosData && (articulosData.data || articulosData.length)) {
            const articulos = articulosData.data || articulosData;
            renderArticulos(articulos);
            console.log('✅ Artículos renderizados:', articulos.length);
        } else {
            console.log('⚠️ No hay artículos para mostrar, usando fallback');
            renderArticulosFallback();
        }
    } catch (error) {
        console.error('❌ Error cargando artículos:', error);
        renderArticulosFallback();
    }
}

// Función fallback para mostrar artículos estáticos si la API falla
function renderArticulosFallback() {
    console.log('🔄 Renderizando artículos fallback...');
    const articulosGrid = document.querySelector('.articulos-grid');
    if (!articulosGrid) return;
    
    // Mantener el contenido HTML original como fallback
    // No hacer nada si ya hay contenido estático
    if (articulosGrid.innerHTML.trim() && !articulosGrid.innerHTML.includes('undefined')) {
        console.log('✅ Manteniendo artículos estáticos existentes');
        return;
    }
    
    // Si hay contenido con undefined, reemplazar con mensaje de error
    articulosGrid.innerHTML = `
        <div class="error-placeholder" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c; margin-bottom: 15px;"></i>
            <p>Error cargando artículos desde el servidor. Por favor, inténtalo más tarde.</p>
        </div>
    `;
}

// Renderizar artículos dinámicamente
function renderArticulos(articulos) {
    const articulosGrid = document.querySelector('.articulos-grid');
    if (!articulosGrid || !articulos || !articulos.length) {
        console.log('⚠️ No se pudo renderizar artículos:', { articulosGrid: !!articulosGrid, articulos: articulos?.length || 0 });
        return;
    }
    
    console.log('🎨 Renderizando artículos:', articulos.length);
    
    articulosGrid.innerHTML = articulos.map(articulo => {
        // Mapear los campos de la base de datos a los esperados por el frontend
        const titulo = articulo.titulo || articulo.title || 'Título no disponible';
        const descripcion = articulo.descripcion || articulo.content || 'Contenido no disponible';
        const icono = articulo.icono || getIconoByTitle(titulo);
        
        return `
            <article class="articulo-card">
                <div class="articulo-image">
                    <i class="${icono}"></i>
                </div>
                <h3>${titulo}</h3>
                <p>${descripcion}</p>
                <a href="#" class="articulo-link" onclick="verArticulo(${articulo.id})">
                    Leer más <i class="fas fa-arrow-right"></i>
                </a>
            </article>
        `;
    }).join('');
}

// Función helper para obtener icono basado en el título
function getIconoByTitle(titulo) {
    const tituloLower = titulo.toLowerCase();
    
    if (tituloLower.includes('defensa')) return 'fas fa-shield-alt';
    if (tituloLower.includes('pala') || tituloLower.includes('elegir')) return 'fas fa-table-tennis';
    if (tituloLower.includes('potencia') || tituloLower.includes('top')) return 'fas fa-fire';
    if (tituloLower.includes('principiante')) return 'fas fa-graduation-cap';
    if (tituloLower.includes('cuidado') || tituloLower.includes('mantenimiento')) return 'fas fa-tools';
    if (tituloLower.includes('error')) return 'fas fa-exclamation-triangle';
    if (tituloLower.includes('control') || tituloLower.includes('vs')) return 'fas fa-balance-scale';
    if (tituloLower.includes('material')) return 'fas fa-atom';
    if (tituloLower.includes('avanzado') || tituloLower.includes('profesional')) return 'fas fa-trophy';
    if (tituloLower.includes('limpiar') || tituloLower.includes('limpia')) return 'fas fa-soap';
    
    return 'fas fa-table-tennis'; // Icono por defecto
}

// Ver artículo específico
function verArticulo(id) {
    console.log('Ver artículo:', id);
    // Aquí se puede implementar un modal o navegación a artículo completo
}

// Cargar palas desde el backend
async function loadPalas() {
    try {
        console.log('🔄 Cargando palas...');
        const palasData = await fetchFromAPI('/palas');
        console.log('📦 Respuesta palas:', palasData);
        
        if (palasData && (palasData.data || palasData.length)) {
            const palas = palasData.data || palasData;
            renderPalas(palas);
            console.log('✅ Palas renderizadas:', palas.length);
        } else {
            console.log('⚠️ No hay palas para mostrar');
            renderPalasError();
        }
    } catch (error) {
        console.error('❌ Error cargando palas:', error);
        renderPalasError();
    }
}

// Renderizar palas dinámicamente
function renderPalas(palas) {
    const palasGrid = document.getElementById('palas-grid');
    if (!palasGrid) return;
    
    if (!palas || palas.length === 0) {
        palasGrid.innerHTML = '<p class="no-data">No hay palas disponibles en este momento.</p>';
        return;
    }
    
    palasGrid.innerHTML = palas.map(pala => `
        <div class="pala-card">
            <div class="pala-image">
                <div class="pala-placeholder">
                    <i class="fas fa-table-tennis fa-3x"></i>
                </div>
            </div>
            <div class="pala-content">
                <h3>${pala.nombre || pala.modelo || 'Pala sin nombre'}</h3>
                <p class="pala-marca">${pala.marca || 'Marca no especificada'}</p>
                <p class="pala-descripcion">${pala.descripcion || 'Descripción no disponible'}</p>
                <div class="pala-specs">
                    <span class="spec"><strong>Peso:</strong> ${pala.peso || 'N/A'}g</span>
                    <span class="spec"><strong>Balance:</strong> ${pala.balance || 'N/A'}</span>
                    <span class="spec"><strong>Forma:</strong> ${pala.forma || 'N/A'}</span>
                </div>
                <div class="pala-footer">
                    <span class="pala-precio">€${pala.precio || '0.00'}</span>
                    <button class="btn-comprar" onclick="verPala(${pala.id})">
                        <i class="fas fa-shopping-cart"></i> Ver Detalles
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Mostrar error al cargar palas
function renderPalasError() {
    const palasGrid = document.getElementById('palas-grid');
    if (!palasGrid) return;
    
    palasGrid.innerHTML = `
        <div class="error-placeholder">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al cargar las palas. Por favor, inténtalo más tarde.</p>
        </div>
    `;
}

// Ver detalles de una pala específica
function verPala(id) {
    console.log('Ver pala:', id);
    // Aquí se puede implementar un modal con detalles completos
    alert(`Ver detalles de la pala con ID: ${id}`);
}

// Cargar usuarios desde el backend
async function loadUsuarios() {
    try {
        const usuariosData = await fetchFromAPI('/usuarios');
        console.log('Usuarios cargados:', usuariosData);
        // Aquí se puede integrar con funcionalidades de usuarios
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

// Cargar reservas desde el backend
async function loadReservasFromBackend() {
    try {
        const reservasData = await fetchFromAPI('/reservas');
        console.log('Reservas del backend:', reservasData);
        // Se puede integrar con el sistema de reservas actual
    } catch (error) {
        console.error('Error cargando reservas del backend:', error);
    }
}

// Guardar reserva en el backend
async function saveReservaToBackend(reservaData) {
    try {
        console.log('💾 Guardando reserva en backend:', reservaData);
        
        const response = await fetch(`${CONFIG.apiUrl}/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservaData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Reserva guardada exitosamente:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error guardando reserva en backend:', error);
        throw error;
    }
}

// Inicializar carga de datos del backend
async function initializeBackendData() {
    try {
        await Promise.all([
            loadArticulos(),
            loadPalas(),
            loadUsuarios(),
            loadReservasFromBackend()
        ]);
        console.log('Todos los datos del backend cargados exitosamente');
    } catch (error) {
        console.error('Error inicializando datos del backend:', error);
    }
}

// Exportar funciones globales
window.eliminarReserva = eliminarReserva;
window.editarReserva = editarReserva;
window.closeEditReservaModal = closeEditReservaModal;
window.verArticulo = verArticulo;
window.verPala = verPala;

// ================ AUTHENTICATION SYSTEM ================

// Inicializar sistema de autenticación
function initializeAuth() {
    // Verificar si hay un usuario logueado
    loadUserFromStorage();
    updateAuthUI();
    setupAuthEventListeners();
}

// Cargar usuario desde localStorage
function loadUserFromStorage() {
    try {
        const token = localStorage.getItem(CONFIG.storage.tokenKey);
        const userData = localStorage.getItem(CONFIG.storage.userKey);
        
        if (token && userData) {
            currentUser = JSON.parse(userData);
            console.log('Usuario cargado desde storage:', currentUser);
        }
    } catch (error) {
        console.error('Error cargando usuario desde storage:', error);
        clearUserStorage();
    }
}

// Limpiar datos de usuario del storage
function clearUserStorage() {
    localStorage.removeItem(CONFIG.storage.tokenKey);
    localStorage.removeItem(CONFIG.storage.userKey);
    currentUser = null;
}

// Actualizar UI según estado de autenticación
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (currentUser) {
        // Usuario logueado
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = currentUser.nombre;
    } else {
        // Usuario no logueado
        loginBtn.style.display = 'inline-flex';
        registerBtn.style.display = 'inline-flex';
        userMenu.style.display = 'none';
    }
}

// Configurar event listeners de autenticación
function setupAuthEventListeners() {
    // Botones de abrir modales
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
    
    // Botones de cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // Cerrar modal al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Formularios
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    
    // Switch entre modales
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('loginModal');
        openModal('registerModal');
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('registerModal');
        openModal('loginModal');
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// Abrir modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    modal.style.display = 'flex';
    
    // Limpiar mensajes previos
    clearMessages(modalId);
}

// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    // Limpiar formularios
    const form = modal.querySelector('form');
    if (form) form.reset();
    clearMessages(modalId);
}

// Limpiar mensajes de error/éxito
function clearMessages(modalId) {
    const modal = document.getElementById(modalId);
    const errorMsg = modal.querySelector('.error-message');
    const successMsg = modal.querySelector('.success-message');
    
    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
    if (successMsg) {
        successMsg.style.display = 'none';
        successMsg.textContent = '';
    }
}

// Mostrar mensaje de error
function showError(modalId, message) {
    const modal = document.getElementById(modalId);
    const errorMsg = modal.querySelector('.error-message');
    
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}

// Mostrar mensaje de éxito
function showSuccess(modalId, message) {
    const modal = document.getElementById(modalId);
    const successMsg = modal.querySelector('.success-message');
    
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    
    // Auto-hide después de 3 segundos
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const formData = new FormData(form);
    
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    // Validaciones básicas
    if (!loginData.email || !loginData.password) {
        showError('loginModal', 'Por favor completa todos los campos');
        return;
    }
    
    // Deshabilitar botón durante la petición
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    
    try {
        const response = await fetch(`${CONFIG.apiUrl}/usuarios/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Guardar datos del usuario y token
            currentUser = result.data.user;
            localStorage.setItem(CONFIG.storage.tokenKey, result.data.token);
            localStorage.setItem(CONFIG.storage.userKey, JSON.stringify(currentUser));
            
            showSuccess('loginModal', 'Inicio de sesión exitoso');
            updateAuthUI();
            
            // Cerrar modal después de un breve delay
            setTimeout(() => {
                closeModal('loginModal');
            }, 1500);
            
        } else {
            showError('loginModal', result.error || 'Error al iniciar sesión');
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showError('loginModal', 'Error de conexión. Inténtalo de nuevo.');
        
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const formData = new FormData(form);
    
    const registerData = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        nivel: formData.get('nivel'),
        password: formData.get('password'),
        passwordConfirm: formData.get('passwordConfirm')
    };
    
    // Validaciones
    if (!registerData.nombre || !registerData.email || !registerData.password) {
        showError('registerModal', 'Por favor completa todos los campos obligatorios');
        return;
    }
    
    if (registerData.password !== registerData.passwordConfirm) {
        showError('registerModal', 'Las contraseñas no coinciden');
        return;
    }
    
    if (registerData.password.length < 6) {
        showError('registerModal', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    // Deshabilitar botón durante la petición
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    
    try {
        // Remover passwordConfirm del objeto enviado
        delete registerData.passwordConfirm;
        
        const response = await fetch(`${CONFIG.apiUrl}/usuarios/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Guardar datos del usuario y token
            currentUser = result.data.user;
            localStorage.setItem(CONFIG.storage.tokenKey, result.data.token);
            localStorage.setItem(CONFIG.storage.userKey, JSON.stringify(currentUser));
            
            showSuccess('registerModal', 'Registro exitoso. ¡Bienvenido!');
            updateAuthUI();
            
            // Cerrar modal después de un breve delay
            setTimeout(() => {
                closeModal('registerModal');
            }, 1500);
            
        } else {
            showError('registerModal', result.error || 'Error al registrarse');
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        showError('registerModal', 'Error de conexión. Inténtalo de nuevo.');
        
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
    }
}

// Manejar logout
function handleLogout(e) {
    e.preventDefault();
    
    // Limpiar datos locales
    clearUserStorage();
    
    // Actualizar UI
    updateAuthUI();
    
    console.log('Usuario ha cerrado sesión');
}

// Obtener token para peticiones autenticadas
function getAuthToken() {
    return localStorage.getItem(CONFIG.storage.tokenKey);
}

// Hacer petición autenticada
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    
    const authOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };
    
    const response = await fetch(url, authOptions);
    
    // Si el token ha expirado, limpiar datos y actualizar UI
    if (response.status === 401 || response.status === 403) {
        clearUserStorage();
        updateAuthUI();
    }
    
    return response;
}

console.log('🎾 Sistema de reservas de pádel cargado correctamente!');