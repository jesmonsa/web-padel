# 🎾 PadelClub Elite - Sistema de Reservas Web

Sistema completo de gestión de reservas para club de pádel con autenticación JWT, CRUD completo y arquitectura híbrida (MySQL + MongoDB).

## ✨ Características Principales

### 🔐 **Sistema de Autenticación**
- Registro y login de usuarios con JWT
- Autenticación segura con bcrypt
- Gestión de perfiles de usuario
- Control de acceso a reservas

### 🏛️ **Funcionalidades Core**
- **CRUD Completo de Reservas**: Crear, leer, actualizar y eliminar reservas
- **Propiedad de Reservas**: Solo el propietario puede modificar/eliminar
- **Almacenamiento Híbrido**: MySQL (contenido estático) + MongoDB (datos dinámicos)
- **API REST**: Backend completo con Express.js
- **Diseño Responsivo**: Frontend optimizado para todos los dispositivos

### 🏓 **Gestión de Pistas**
- **Pista Central**: €25/hora - Profesional con césped sintético premium
- **Pista Norte**: €20/hora - Perfecta para entrenamientos 
- **Pista Sur**: €15/hora - Ideal para principiantes

## 🏗️ Arquitectura del Sistema

```
web-padel/
├── backend/                     # Servidor Express.js
│   ├── config/
│   │   ├── mongodb.js          # Configuración MongoDB
│   │   └── mysql.js            # Configuración MySQL
│   ├── routes/
│   │   ├── usuarios.js         # Autenticación y usuarios
│   │   ├── reservas.js         # CRUD de reservas
│   │   ├── palas.js           # Catálogo de palas
│   │   ├── articulos.js       # Artículos y noticias
│   │   ├── pistas.js          # Información de pistas
│   │   └── torneos.js         # Gestión de torneos
│   ├── .env.example           # Template de variables de entorno
│   ├── server.js              # Servidor principal
│   └── package.json           # Dependencias del backend
├── frontend/
│   ├── index.html             # Página principal
│   ├── css/styles.css         # Estilos responsivos
│   └── js/script.js           # Frontend con API integration
└── test/
    └── integration-test.js     # Suite de pruebas automatizadas
```

## 🛠️ Stack Tecnológico

### Backend
- **Node.js + Express.js**: Servidor API REST
- **MongoDB**: Base de datos para usuarios, reservas y torneos
- **MySQL (MariaDB)**: Base de datos para contenido estático
- **JWT**: Autenticación y autorización
- **bcrypt**: Encriptación de contraseñas
- **CORS**: Control de acceso entre dominios
- **Helmet**: Seguridad HTTP headers
- **Express Rate Limit**: Limitación de requests

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Grid, Flexbox, animaciones
- **JavaScript ES6+**: Integración con API
- **LocalStorage**: Fallback y cache
- **Responsive Design**: Mobile-first approach

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+ instalado
- MongoDB running (local o remoto)
- MySQL/MariaDB running (local o remoto)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tuusuario/web-padel.git
cd web-padel
```

### 2. Configurar el Backend
```bash
cd backend
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env con tus configuraciones:
nano .env
```

### 4. Configuración de Base de Datos

#### Variables de entorno requeridas (.env):
```bash
# Servidor
PORT=3000
NODE_ENV=development

# MySQL - Contenido estático (palas, artículos, pistas)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=tu_usuario_mysql
MYSQL_PASSWORD=tu_contraseña_mysql
MYSQL_DATABASE=backend_laravel

# MongoDB - Datos dinámicos (usuarios, reservas, torneos)
MONGODB_URI=mongodb://localhost:27017/web_padel_db

# Seguridad
JWT_SECRET=tu_clave_secreta_jwt_minimo_32_caracteres
API_RATE_LIMIT=100

# CORS
CORS_ORIGIN=http://localhost:8080,http://127.0.0.1:8080,http://localhost:5500
```

### 5. Iniciar el Servidor
```bash
# Desarrollo con nodemon
npm run dev

# O producción
npm start
```

### 6. Abrir el Frontend
Abrir `index.html` en un servidor web local (puerto 5500, 8080, etc.)

## 🔐 API Endpoints

### Autenticación
```
POST /api/usuarios/register    # Registro de usuarios
POST /api/usuarios/login       # Login
GET  /api/usuarios/profile     # Perfil (requiere JWT)
```

### Reservas (requiere autenticación)
```
GET    /api/reservas          # Listar todas las reservas
POST   /api/reservas          # Crear nueva reserva
PUT    /api/reservas/:id      # Actualizar reserva (solo propietario)
DELETE /api/reservas/:id      # Eliminar reserva (solo propietario)
```

### Contenido Estático
```
GET /api/palas               # Catálogo de palas
GET /api/articulos           # Artículos y noticias
GET /api/pistas              # Información de pistas
GET /api/torneos             # Lista de torneos
```

## 🧪 Testing

### Suite de Pruebas Automatizadas
```bash
# Ejecutar pruebas de integración
node test/integration-test.js
```

### Cobertura de Pruebas
- ✅ Conectividad del servidor
- ✅ Autenticación (registro, login, perfil)
- ✅ CRUD de reservas con autenticación
- ✅ Seguridad y autorización
- ✅ Validación de datos
- ✅ Integridad de base de datos

## 🔒 Seguridad

### Medidas Implementadas
- **Autenticación JWT**: Tokens seguros con expiración
- **Encriptación bcrypt**: Passwords hasheadas
- **Rate Limiting**: 100 requests por 15 minutos
- **CORS**: Control de orígenes permitidos
- **Helmet**: Headers de seguridad HTTP
- **Validación de entrada**: Sanitización de datos
- **Variables de entorno**: Datos sensibles protegidos

### Archivo .gitignore
```
# ARCHIVOS SENSIBLES EXCLUIDOS
.env
.env.*
*.sql
*.sqlite
*.key
*.pem
node_modules/
logs/
```

## 📋 Uso de la Aplicación

### 1. Registro/Login
- Registrarse con email y contraseña
- Iniciar sesión para acceder a reservas
- Token JWT automático para sesiones

### 2. Hacer Reservas
- Seleccionar pista, fecha, hora y duración
- Confirmación en tiempo real
- Solo usuarios autenticados

### 3. Gestionar Reservas
- Ver mis reservas en el panel
- Editar/eliminar solo mis reservas
- Validación de propiedad

### 4. Navegación
- Menú responsivo con hamburguesa móvil
- Scroll suave entre secciones
- Indicadores de estado visual

## 🛠️ Personalización

### Configurar Precios
```javascript
// En js/script.js
const CONFIG = {
    precios: {
        central: 25,  // €/hora
        norte: 20,
        sur: 15
    }
}
```

### Modificar JWT
```javascript
// En backend/routes/usuarios.js
jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '24h' // Cambiar duración
});
```

## 🔧 Desarrollo

### Estructura del Código

#### Backend Routes
- `usuarios.js`: Autenticación JWT completa
- `reservas.js`: CRUD con middleware de autenticación
- `palas.js`: Contenido estático desde MySQL
- Otros routes: Gestión de contenido

#### Frontend Integration
- `script.js`: API calls con manejo de tokens
- `styles.css`: Diseño responsivo completo
- `index.html`: SPA con secciones dinámicas

### Scripts Disponibles
```bash
npm run dev        # Desarrollo con nodemon
npm start          # Producción
npm test           # Ejecutar pruebas
```

## 📱 Compatibilidad

✅ **Navegadores**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
✅ **Dispositivos**: Desktop, Tablet, Mobile
✅ **APIs**: localStorage fallback, modern fetch API

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más información.

---

**🎾 PadelClub Elite - Gestión Profesional de Reservas**

*Sistema completo full-stack con autenticación JWT y arquitectura híbrida*