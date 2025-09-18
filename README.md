# 🎾 PadelClub Elite - Sistema de Reservas Web

Una aplicación web profesional para la gestión de reservas de pistas de pádel con almacenamiento local y diseño responsivo.

## ✨ Características

### 🏛️ **Funcionalidades Principales**
- **Sistema de Reservas Completo**: Reserva pistas por fecha, hora y duración
- **Gestión de Disponibilidad**: Control automático de horarios ocupados
- **Almacenamiento Local**: Todas las reservas se guardan en localStorage
- **Diseño Responsivo**: Optimizado para móviles, tablets y desktop
- **Interfaz Profesional**: Diseño moderno con animaciones y efectos

### 🏓 **Pistas Disponibles**
- **Pista Central**: €25/hora - Profesional con césped sintético premium
- **Pista Norte**: €20/hora - Perfecta para entrenamientos 
- **Pista Sur**: €15/hora - Ideal para principiantes

### 🕐 **Horarios**
- **Lunes a Viernes**: 8:00 - 23:00
- **Sábados y Domingos**: 9:00 - 22:00
- **Reservas**: Por horas completas (1h, 1.5h, 2h)

## 🗂️ Estructura del Proyecto

```
web-padel/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos CSS personalizados
├── js/
│   └── script.js       # Lógica JavaScript
└── images/             # Carpeta para imágenes (vacía)
```

## 🚀 Instalación y Uso

1. **Clonar/Descargar el proyecto** en tu servidor local
2. **Abrir `index.html`** en tu navegador web
3. **¡Listo!** - No requiere instalación adicional

### Requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Conexión a internet (para FontAwesome CDN)

## 💻 Tecnologías Utilizadas

- **HTML5**: Estructura semántica y accesible
- **CSS3**: Estilos modernos con Grid, Flexbox y animaciones
- **JavaScript ES6+**: Funcionalidad interactiva y gestión de datos
- **FontAwesome**: Iconografía profesional
- **LocalStorage API**: Persistencia de datos del cliente

## 🎯 Funcionalidades Detalladas

### ✅ **Sistema de Reservas**
- Validación de formularios en tiempo real
- Prevención de conflictos de horarios
- Cálculo automático de precios
- Confirmación visual de reservas

### 📱 **Diseño Responsivo**
- Navegación móvil con menú hamburguesa
- Layouts adaptativos para todas las pantallas
- Optimizado para touch en dispositivos móviles

### 💾 **Gestión de Datos**
- Almacenamiento automático en localStorage
- Auto-guardado cada 30 segundos
- Recuperación de datos al recargar página
- Exportación de reservas (función disponible en consola)

### 🎨 **Interfaz de Usuario**
- Animaciones CSS suaves
- Modal de confirmación
- Indicadores visuales de estado
- Scroll suave entre secciones

## 📋 **Cómo Usar la Aplicación**

### Hacer una Reserva:
1. Navegar a la sección "Reservas"
2. Completar el formulario con tus datos
3. Seleccionar pista, fecha, hora y duración
4. Confirmar la reserva
5. Ver confirmación en modal

### Gestionar Reservas:
- **Ver reservas**: Panel lateral derecho
- **Eliminar reserva**: Botón X en cada reserva
- **Limpiar todas**: Botón "Limpiar Todas las Reservas"

### Navegación:
- **Menú superior**: Enlaces a todas las secciones
- **Scroll suave**: Navegación automática
- **Responsive**: Menú hamburguesa en móvil

## 🛠️ Personalización

### Modificar Precios:
```javascript
// En js/script.js - CONFIG object
precios: {
    central: 25,  // €25/hora
    norte: 20,    // €20/hora 
    sur: 15       // €15/hora
}
```

### Modificar Horarios:
```javascript
// En js/script.js - CONFIG object
horarios: {
    inicio: 8,    // 8:00 AM
    fin: 23,      // 11:00 PM
    intervalo: 1  // Cada 1 hora
}
```

### Cambiar Colores:
```css
/* En css/styles.css - :root variables */
:root {
    --primary-color: #2c5aa0;    /* Azul principal */
    --accent-color: #f39c12;     /* Naranja acentos */
    --success-color: #27ae60;    /* Verde éxito */
}
```

## 🔧 Funciones Avanzadas

### Consola del Desarrollador:
- `exportarReservas()`: Exporta reservas a CSV
- `reservas`: Ver array de reservas actuales
- `CONFIG`: Ver configuración actual

### LocalStorage:
- Clave: `padel_reservas` - Datos de reservas
- Clave: `padel_contador` - Contador de IDs

## 📱 Compatibilidad

✅ **Navegadores Soportados:**
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

✅ **Dispositivos:**
- Desktop (1200px+)
- Tablet (768px - 1199px) 
- Mobile (< 768px)

## 🤝 Soporte y Contribuciones

Para reportar bugs o sugerir mejoras:
1. Revisar el código en los archivos fuente
2. Probar en diferentes navegadores
3. Verificar la consola para errores

## 📄 Licencia

Este proyecto es de uso libre para fines educativos y comerciales.

---

**Desarrollado con ❤️ para PadelClub Elite**

*Sistema de reservas moderno, intuitivo y profesional*