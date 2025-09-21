/**
 * Test de Integración Completa - Sistema Pádel Club
 * 
 * Este script realiza pruebas automatizadas de todos los componentes:
 * - APIs Backend (MySQL + MongoDB)
 * - Autenticación JWT
 * - CRUD de reservas
 * - Conectividad de servicios
 */

const https = require('http');
const querystring = require('querystring');

// Configuración de testing
const CONFIG = {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
    testUser: {
        nombre: 'Usuario Test Integración',
        email: `test-${Date.now()}@padel.com`,
        password: 'test123456',
        telefono: '666123456',
        nivel: 'intermedio'
    }
};

let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

let authToken = null;
let testUserId = null;
let testReservaId = null;

// Utilidad para hacer peticiones HTTP
function makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, CONFIG.baseUrl);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: CONFIG.timeout
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (err) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Función de logging
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',    // Cyan
        SUCCESS: '\x1b[32m', // Green
        ERROR: '\x1b[31m',   // Red
        WARN: '\x1b[33m',    // Yellow
        RESET: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${colors.RESET}`);
}

// Función para verificar test
function assert(condition, message) {
    if (condition) {
        testResults.passed++;
        log(`✅ PASS: ${message}`, 'SUCCESS');
    } else {
        testResults.failed++;
        testResults.errors.push(message);
        log(`❌ FAIL: ${message}`, 'ERROR');
    }
}

// Tests específicos
async function testAPIsConnectivity() {
    log('🔌 Iniciando tests de conectividad de APIs...', 'INFO');
    
    try {
        // Test API Artículos (MySQL)
        const articulos = await makeRequest('GET', '/api/articulos');
        assert(articulos.status === 200, 'API Artículos MySQL conectada');
        assert(articulos.data.success === true, 'API Artículos responde correctamente');
        
        // Test API Palas (MySQL)
        const palas = await makeRequest('GET', '/api/palas');
        assert(palas.status === 200, 'API Palas MySQL conectada');
        assert(palas.data.success === true, 'API Palas responde correctamente');
        
        // Test API Reservas (MongoDB)
        const reservas = await makeRequest('GET', '/api/reservas');
        assert(reservas.status === 200, 'API Reservas MongoDB conectada');
        assert(reservas.data.success === true, 'API Reservas responde correctamente');
        
        // Test API Usuarios (MongoDB)
        const usuarios = await makeRequest('GET', '/api/usuarios');
        assert(usuarios.status === 200, 'API Usuarios MongoDB conectada');
        assert(usuarios.data.success === true, 'API Usuarios responde correctamente');
        
    } catch (error) {
        log(`Error en tests de conectividad: ${error.message}`, 'ERROR');
        assert(false, `Conectividad de APIs: ${error.message}`);
    }
}

async function testAuthentication() {
    log('🔐 Iniciando tests de autenticación...', 'INFO');
    
    try {
        // Test Registro
        const register = await makeRequest('POST', '/api/usuarios/register', CONFIG.testUser);
        assert(register.status === 201, 'Usuario registrado exitosamente');
        assert(register.data.success === true, 'Registro responde success=true');
        assert(register.data.data.token != null, 'Token JWT generado en registro');
        
        if (register.data.success) {
            authToken = register.data.data.token;
            testUserId = register.data.data.user.id;
        }
        
        // Test Login
        const login = await makeRequest('POST', '/api/usuarios/login', {
            email: CONFIG.testUser.email,
            password: CONFIG.testUser.password
        });
        assert(login.status === 200, 'Login exitoso');
        assert(login.data.success === true, 'Login responde success=true');
        assert(login.data.data.token != null, 'Token JWT generado en login');
        
        if (login.data.success) {
            authToken = login.data.data.token;
        }
        
        // Test Profile con autenticación
        if (authToken) {
            const profile = await makeRequest('GET', '/api/usuarios/profile', null, {
                'Authorization': `Bearer ${authToken}`
            });
            assert(profile.status === 200, 'Perfil obtenido con token válido');
            assert(profile.data.success === true, 'Profile responde success=true');
        }
        
    } catch (error) {
        log(`Error en tests de autenticación: ${error.message}`, 'ERROR');
        assert(false, `Autenticación: ${error.message}`);
    }
}

async function testCRUDReservas() {
    log('📝 Iniciando tests CRUD de reservas...', 'INFO');
    
    if (!authToken) {
        log('No hay token de autenticación disponible para tests CRUD', 'WARN');
        return;
    }
    
    try {
        // Test CREATE - Crear reserva
        const nuevaReserva = {
            usuario: CONFIG.testUser.nombre,
            email: CONFIG.testUser.email,
            telefono: CONFIG.testUser.telefono,
            pista: 'Central',
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
            duracion: 1.5,
            precio: 37.5
        };
        
        const createReserva = await makeRequest('POST', '/api/reservas', nuevaReserva, {
            'Authorization': `Bearer ${authToken}`
        });
        assert(createReserva.status === 201, 'Reserva creada exitosamente');
        assert(createReserva.data.success === true, 'CREATE reserva success=true');
        
        if (createReserva.data.success) {
            testReservaId = createReserva.data.data._id;
        }
        
        // Test READ - Obtener reserva específica
        if (testReservaId) {
            const getReserva = await makeRequest('GET', `/api/reservas/${testReservaId}`);
            assert(getReserva.status === 200, 'Reserva obtenida exitosamente');
            assert(getReserva.data.success === true, 'READ reserva success=true');
        }
        
        // Test UPDATE - Actualizar reserva
        if (testReservaId) {
            const updateData = {
                duracion: 2,
                precio: 50
            };
            
            const updateReserva = await makeRequest('PUT', `/api/reservas/${testReservaId}`, updateData, {
                'Authorization': `Bearer ${authToken}`
            });
            assert(updateReserva.status === 200, 'Reserva actualizada exitosamente');
            assert(updateReserva.data.success === true, 'UPDATE reserva success=true');
        }
        
        // Test DELETE - Eliminar reserva
        if (testReservaId) {
            const deleteReserva = await makeRequest('DELETE', `/api/reservas/${testReservaId}`, null, {
                'Authorization': `Bearer ${authToken}`
            });
            assert(deleteReserva.status === 200, 'Reserva eliminada exitosamente');
            assert(deleteReserva.data.success === true, 'DELETE reserva success=true');
        }
        
    } catch (error) {
        log(`Error en tests CRUD: ${error.message}`, 'ERROR');
        assert(false, `CRUD Reservas: ${error.message}`);
    }
}

async function testDataIntegrity() {
    log('🛡️ Iniciando tests de integridad de datos...', 'INFO');
    
    try {
        // Test datos MySQL (Artículos)
        const articulos = await makeRequest('GET', '/api/articulos?limit=5');
        if (articulos.data.success) {
            const arts = articulos.data.data;
            assert(Array.isArray(arts), 'Artículos devuelve array');
            assert(arts.length > 0, 'Hay artículos en la base de datos');
            
            if (arts.length > 0) {
                const art = arts[0];
                assert(art.id != null, 'Artículo tiene ID');
                assert(art.title != null, 'Artículo tiene título');
                assert(art.content != null, 'Artículo tiene contenido');
            }
        }
        
        // Test datos MySQL (Palas)
        const palas = await makeRequest('GET', '/api/palas?limit=5');
        if (palas.data.success) {
            const pals = palas.data.data;
            assert(Array.isArray(pals), 'Palas devuelve array');
            assert(pals.length > 0, 'Hay palas en la base de datos');
            
            if (pals.length > 0) {
                const pala = pals[0];
                assert(pala.id != null, 'Pala tiene ID');
                assert(pala.marca != null, 'Pala tiene marca');
                assert(pala.modelo != null, 'Pala tiene modelo');
            }
        }
        
        // Test datos MongoDB (Reservas)
        const reservas = await makeRequest('GET', '/api/reservas?limit=5');
        if (reservas.data.success) {
            const resrv = reservas.data.data;
            assert(Array.isArray(resrv), 'Reservas devuelve array');
            
            if (resrv.length > 0) {
                const reserva = resrv[0];
                assert(reserva._id != null, 'Reserva tiene _id');
                assert(reserva.usuario != null, 'Reserva tiene usuario');
                assert(reserva.pista != null, 'Reserva tiene pista');
            }
        }
        
    } catch (error) {
        log(`Error en tests de integridad: ${error.message}`, 'ERROR');
        assert(false, `Integridad de datos: ${error.message}`);
    }
}

async function testSecurity() {
    log('🔒 Iniciando tests de seguridad...', 'INFO');
    
    try {
        // Test endpoint protegido sin token
        const profileNoToken = await makeRequest('GET', '/api/usuarios/profile');
        assert(profileNoToken.status === 401, 'Endpoint protegido rechaza petición sin token');
        
        // Test endpoint protegido con token inválido
        const profileBadToken = await makeRequest('GET', '/api/usuarios/profile', null, {
            'Authorization': 'Bearer invalid-token-123'
        });
        assert(profileBadToken.status === 403, 'Endpoint protegido rechaza token inválido');
        
        // Test operación CRUD sin permisos
        const deleteUnauthorized = await makeRequest('DELETE', '/api/reservas/507f1f77bcf86cd799439011');
        assert(deleteUnauthorized.status === 401, 'DELETE sin token es rechazado');
        
        // Test rate limiting (si está configurado)
        log('Tests de rate limiting requieren múltiples peticiones rápidas...', 'WARN');
        
    } catch (error) {
        log(`Error en tests de seguridad: ${error.message}`, 'ERROR');
        assert(false, `Seguridad: ${error.message}`);
    }
}

// Función principal de testing
async function runAllTests() {
    log('🚀 INICIANDO SUITE DE TESTS DE INTEGRACIÓN COMPLETA', 'INFO');
    log('================================================', 'INFO');
    
    const startTime = Date.now();
    
    try {
        await testAPIsConnectivity();
        await testAuthentication();
        await testCRUDReservas();
        await testDataIntegrity();
        await testSecurity();
        
    } catch (error) {
        log(`Error crítico en suite de tests: ${error.message}`, 'ERROR');
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Reporte final
    log('================================================', 'INFO');
    log('📊 REPORTE FINAL DE TESTS DE INTEGRACIÓN', 'INFO');
    log('================================================', 'INFO');
    log(`✅ Tests pasados: ${testResults.passed}`, 'SUCCESS');
    log(`❌ Tests fallidos: ${testResults.failed}`, testResults.failed > 0 ? 'ERROR' : 'SUCCESS');
    log(`⏱️  Duración total: ${duration}s`, 'INFO');
    log(`📈 Ratio de éxito: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`, 'INFO');
    
    if (testResults.failed > 0) {
        log('📋 ERRORES DETALLADOS:', 'ERROR');
        testResults.errors.forEach((error, index) => {
            log(`${index + 1}. ${error}`, 'ERROR');
        });
    }
    
    const finalStatus = testResults.failed === 0 ? 'SUCCESS' : 'ERROR';
    const statusMessage = testResults.failed === 0 ? 
        '🎉 TODOS LOS TESTS PASARON - SISTEMA COMPLETAMENTE FUNCIONAL' :
        '⚠️  ALGUNOS TESTS FALLARON - REVISAR ERRORES ARRIBA';
        
    log(statusMessage, finalStatus);
    
    // Exit code para CI/CD
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Ejecutar tests
if (require.main === module) {
    runAllTests().catch(error => {
        log(`Error fatal ejecutando tests: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testAPIsConnectivity,
    testAuthentication,
    testCRUDReservas,
    testDataIntegrity,
    testSecurity
};