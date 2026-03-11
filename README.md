# ✝ Sistema Parroquial — Nuestra Señora del Rosario
**Sistema de Gestión Documentaria Parroquial v2.0**  
Huarmey, Áncash, Perú

---

## 🚀 Instalación Rápida

### Requisitos
- **Node.js** 18+ → https://nodejs.org
- **PostgreSQL** 14+ → https://www.postgresql.org
- Token API RENIEC → https://apisperu.com *(plan gratuito disponible)*

---

### 1. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Editar `.env` con sus datos:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parroquia_db
DB_USER=postgres
DB_PASSWORD=su_password

JWT_SECRET=cambiar_por_clave_segura_aleatoria

RENIEC_TOKEN=su_token_de_apisperu.com
RENIEC_API_URL=https://api.apisperu.com/api/dni
```

### 2. Instalar dependencias

```bash
cd backend
npm install
```

### 3. Crear base de datos

```bash
npm run setup-db
```
Esto crea la BD `parroquia_db`, todas las tablas y los usuarios iniciales.

### 4. Iniciar el servidor

```bash
npm start
# o en desarrollo con auto-reload:
npm run dev
```

Abrir: **http://localhost:3000**

---

## 🔑 Usuarios Iniciales

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| `parroco` | `parroco123` | Párroco | Todo + Configuración |
| `secretaria` | `secre123` | Secretaria | Registrar, editar, constancias |
| `consulta` | `ver123` | Consulta | Solo lectura |

> ⚠️ **Cambiar contraseñas inmediatamente** después de la instalación.

---

## 🔍 Configuración RENIEC / API DNI

El sistema usa **[APIsPerú](https://apisperu.com)** para validar DNI en tiempo real.

1. Registrarse en https://apisperu.com (plan gratuito: 100 consultas/mes)
2. Obtener el Bearer Token del panel
3. Pegarlo en `.env` → `RENIEC_TOKEN=xxxxx`

**Proveedores compatibles:**
- https://apisperu.com (recomendado)
- https://apiperu.dev
- https://apis.net.pe

**Respuesta de la API:**
```json
{
  "success": true,
  "data": {
    "dni": "12345678",
    "prenombres": "JUAN CARLOS",
    "apPrimer": "GARCIA",
    "apSegundo": "LOPEZ",
    "nombreCompleto": "JUAN CARLOS GARCIA LOPEZ",
    "feNacimiento": "15/03/1985",
    "sexo": "Masculino"
  }
}
```

---

## 🌐 Despliegue en Producción

### Opción A: VPS / Servidor Propio

```bash
# Instalar PM2 para mantener el proceso corriendo
npm install -g pm2
pm2 start server.js --name "parroquia"
pm2 startup
pm2 save
```

### Opción B: Railway.app (gratuito)

1. Crear cuenta en https://railway.app
2. `New Project → Deploy from GitHub`
3. Configurar variables de entorno en el panel
4. Railway provee PostgreSQL automáticamente

### Opción C: Render.com

1. Crear cuenta en https://render.com
2. `New Web Service → Connect GitHub`
3. Configurar `Build Command: npm install`
4. Configurar `Start Command: node server.js`
5. Agregar PostgreSQL desde el panel de Render

### Nginx (proxy reverso)

```nginx
server {
    listen 80;
    server_name parroquia.tudominio.pe;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Archivos subidos
    location /uploads/ {
        alias /ruta/al/proyecto/backend/uploads/;
        expires 30d;
    }
}
```

---

## 📁 Estructura del Proyecto

```
parroquia-full/
├── backend/
│   ├── db/
│   │   ├── index.js       # Pool de conexiones PostgreSQL
│   │   ├── schema.sql     # Esquema completo de la BD
│   │   └── setup.js       # Script de inicialización
│   ├── middleware/
│   │   └── auth.js        # JWT + control de roles + auditoría
│   ├── routes/
│   │   ├── auth.js        # Login, usuarios, contraseñas
│   │   ├── reniec.js      # Consulta DNI → RENIEC
│   │   ├── feligreses.js  # CRUD feligreses
│   │   └── sacramentos.js # Sacramentos, docs, agenda, config, reportes
│   ├── uploads/           # Archivos subidos (creado automáticamente)
│   ├── .env.example       # Plantilla de configuración
│   ├── package.json
│   └── server.js          # Servidor Express principal
│
└── frontend/
    ├── css/
    │   └── style.css      # Estilos del sistema
    ├── js/
    │   ├── api.js         # Cliente HTTP (fetch wrapper)
    │   ├── utils.js       # Utilidades, constantes, helpers
    │   ├── views.js       # Todas las vistas
    │   └── app.js         # Controlador principal
    └── index.html         # Página principal (SPA)
```

---

## 🗄️ Base de Datos

### Tablas principales

| Tabla | Descripción |
|---|---|
| `usuarios` | Cuentas del sistema con roles |
| `configuracion` | Datos de la parroquia |
| `feligreses` | Directorio de miembros |
| `sacramentos` | Registro de los 7 sacramentos |
| `documentos` | Archivos escaneados |
| `agenda` | Eventos litúrgicos |
| `auditoria` | Log de todas las acciones |

### Backup de la base de datos

```bash
# Backup
pg_dump -U postgres parroquia_db > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U postgres parroquia_db < backup_20250311.sql
```

---

## 🔒 Seguridad Implementada

- ✅ Autenticación JWT con expiración (8h)
- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ Rate limiting: 100 req/min general, 10 intentos login/15min
- ✅ Control de roles: párroco / secretaria / consulta
- ✅ Auditoría completa de todas las acciones
- ✅ Sanitización de rutas de archivos (path traversal)
- ✅ Helmet.js para headers de seguridad HTTP
- ✅ CORS configurado

---

## 📞 Soporte

Para obtener token RENIEC:
- **APIsPerú**: https://apisperu.com (recomendado, plan gratuito)
- **ApiPerú.dev**: https://apiperu.dev
- **APIs.net.pe**: https://apis.net.pe

---

*Sistema desarrollado para la Diócesis de Huarmey, Áncash, Perú*
