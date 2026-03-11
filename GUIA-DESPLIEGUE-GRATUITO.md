# 🚀 Guía de Despliegue Gratuito — Sistema Parroquial

> Arquitectura recomendada para una iglesia: **sin costo mensual**.

---

## 🗺️ Resumen de Servicios

| Componente     | Servicio       | Plan Gratuito       | Notas                        |
|----------------|----------------|---------------------|------------------------------|
| 🗄️ Base de datos | **Supabase**  | 500 MB / 2 proyectos | PostgreSQL administrado      |
| ⚙️ Backend Node  | **Render**    | 750 h/mes           | Se duerme tras 15 min inactivo |
| 🌐 Frontend      | **Netlify**   | 100 GB banda/mes    | HTML estático, CDN global    |
| 🔑 Consulta DNI  | **API Inti**  | Créditos gratuitos  | `app.apiinti.dev`            |

---

## 1️⃣ Base de Datos — Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (elige región **South America (São Paulo)**).
3. Ve a **Settings → Database** y copia el **Connection string** (modo URI):
   ```
   postgresql://postgres:[TU-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
4. Abre el **SQL Editor** en Supabase y ejecuta el contenido de `backend/db/schema.sql` para crear las tablas.
5. (Opcional) Ejecuta `backend/db/setup.js` localmente apuntando a Supabase para crear el usuario admin inicial.

---

## 2️⃣ Backend — Render

### Pasos:

1. Ve a [https://render.com](https://render.com) y crea una cuenta gratuita.
2. Haz clic en **New → Web Service**.
3. Conecta tu repositorio de GitHub (sube el proyecto primero a GitHub si no lo has hecho).
4. Configura el servicio:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

5. Ve a **Environment** y agrega estas variables:

   | Variable         | Valor                                              |
   |------------------|----------------------------------------------------|
   | `DATABASE_URL`   | Tu connection string de Supabase                   |
   | `JWT_SECRET`     | Una cadena larga y aleatoria (ej: 64 caracteres)   |
   | `APIINTI_KEY`    | Tu API key de API Inti (`inti_live_xxxx`)           |
   | `NODE_ENV`       | `production`                                       |
   | `FRONTEND_URL`   | URL de tu frontend en Netlify (después de desplegarlo) |
   | `PORT`           | `3000`                                             |

6. Render te dará una URL como `https://sistema-parroquial.onrender.com`.

> ⚠️ **Importante:** El plan gratuito de Render "duerme" el servidor tras 15 minutos de inactividad. El primer request del día puede tardar ~30 segundos en despertar. Esto es normal y aceptable para una iglesia.

---

## 3️⃣ Frontend — Netlify

El frontend es HTML/CSS/JS puro, perfecto para Netlify.

### Opción A — Arrastrar carpeta (más simple):

1. Ve a [https://netlify.com](https://netlify.com) y crea una cuenta.
2. En el Dashboard, arrastra la carpeta `frontend/` al área de drop.
3. Netlify desplegará en segundos y te dará una URL.

### Opción B — Desde GitHub (recomendado para actualizaciones):

1. Sube el proyecto a GitHub.
2. En Netlify: **New site → Import from Git**.
3. Selecciona el repo y configura:
   - **Publish directory:** `frontend`
4. En **Site settings → Environment variables** agrega:
   - (No se necesitan variables en el frontend; la URL del backend se toma de `window.location.origin` si lo sirves desde el mismo dominio, o debes actualizarla en `frontend/js/api.js`).

### Actualizar la URL del backend en el frontend:

Si el frontend está en Netlify y el backend en Render (dominios distintos), edita `frontend/js/api.js` línea 3:

```javascript
// Cambiar esto:
const BASE = window.location.origin + '/api';

// Por esto (URL de tu backend en Render):
const BASE = 'https://sistema-parroquial.onrender.com/api';
```

---

## 4️⃣ API Inti — Consulta DNI

1. Ve a [https://app.apiinti.dev](https://app.apiinti.dev) y crea una cuenta.
2. Desde el Dashboard, crea una nueva **API Key**.
3. Copia la clave (formato `inti_live_xxxx`).
4. Pégala en la variable `APIINTI_KEY` de Render.

---

## ✅ Checklist Final

- [ ] Supabase: proyecto creado y schema ejecutado
- [ ] Render: backend desplegado con variables de entorno configuradas
- [ ] Netlify: frontend desplegado
- [ ] `frontend/js/api.js`: URL del backend actualizada (si son dominios distintos)
- [ ] API Inti: clave configurada en Render
- [ ] Prueba de login con usuario admin
- [ ] Prueba de consulta DNI desde el sistema

---

## 🔐 Crear usuario admin inicial

Una vez el backend esté en Render, ejecuta esto **una sola vez** desde tu máquina local:

```bash
# En la carpeta backend/, con DATABASE_URL apuntando a Supabase:
DATABASE_URL="postgresql://postgres:..." node db/setup.js
```

O puedes hacerlo desde el **SQL Editor de Supabase** insertando directamente:

```sql
-- El password debe ir hasheado con bcrypt (usa https://bcrypt-generator.com con rounds=10)
INSERT INTO usuarios (username, password_hash, nombre, rol)
VALUES ('admin', '$2a$10$HASH_AQUI', 'Administrador', 'admin');
```

---

## 💡 Tips para la iglesia

- **Backups:** Supabase hace backups automáticos diarios en el plan gratuito.
- **Dominio personalizado:** Netlify permite conectar un dominio propio gratis (ej: `sistema.parroquiarosario.pe`).
- **CORS:** Si cambias la URL del frontend, actualiza `FRONTEND_URL` en Render para evitar errores.
- **Logs:** En Render puedes ver los logs en tiempo real desde el Dashboard si hay algún error.
