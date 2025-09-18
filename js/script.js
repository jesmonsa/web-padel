// Configuración de la aplicación
const CONFIG = {
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
        contadorKey: 'padel_contador'
    }
};

// Variables globales
let reservas = [];
let contadorReservas = 0;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función principal de inicialización
function initializeApp() {
    setupEventListeners();
    loadReservasFromStorage();
    setupFechaMinima();
    displayReservas();
    setupMobileNavigation();
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
    const reservaData = {
        id: ++contadorReservas,
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        pista: formData.get('pista'),
        fecha: formData.get('fecha'),
        hora: formData.get('hora'),
        duracion: formData.get('duracion'),
        precio: calcularPrecio(formData.get('pista'), parseFloat(formData.get('duracion'))),
        fechaCreacion: new Date().toISOString()
    };

    if (isHoraOcupada(reservaData.fecha, reservaData.hora, reservaData.pista)) {
        alert('Lo sentimos, esa hora ya está ocupada. Por favor selecciona otra hora.');
        return;
    }

    reservas.push(reservaData);
    saveReservasToStorage();
    displayReservas();
    showConfirmacionModal(reservaData);
    e.target.reset();
    updatePrecioTotal();
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

// Cargar reservas desde localStorage
function loadReservasFromStorage() {
    const reservasGuardadas = localStorage.getItem(CONFIG.storage.reservasKey);
    const contadorGuardado = localStorage.getItem(CONFIG.storage.contadorKey);
    
    if (reservasGuardadas) {
        reservas = JSON.parse(reservasGuardadas);
    }
    
    if (contadorGuardado) {
        contadorReservas = parseInt(contadorGuardado);
    }
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
        
        return `
            <div class="reserva-item" data-id="${reserva.id}">
                <button class="delete-reserva" onclick="eliminarReserva(${reserva.id})">
                    <i class="fas fa-times"></i>
                </button>
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
function eliminarReserva(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
        reservas = reservas.filter(reserva => reserva.id !== id);
        saveReservasToStorage();
        displayReservas();
        updateHorariosDisponibles();
    }
}

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

// Exportar funciones globales
window.eliminarReserva = eliminarReserva;

console.log('🎾 Sistema de reservas de pádel cargado correctamente!');