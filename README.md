<p align="center">
  <img src="client/public/images/logo.webp" alt="AlFallo" width="220">
</p>

<h3 align="center">Registra tus entrenamientos de fuerza. Supera tus marcas. Compártelo.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white" alt="Astro">
  <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Swagger-85EA2D?logo=swagger&logoColor=black" alt="Swagger">
</p>

<p align="center">
  <img src="docs/img/alfallo.gif" alt="Muñeco en pixel art haciendo press con barra hasta llegar al fallo" width="480">
</p>

---

## ¿Qué es AlFallo?

**AlFallo** es una aplicación web para quien entrena en el gimnasio. Llegas, pulsas **Empezar entrenamiento**, eliges qué vas a entrenar y, mientras haces cada ejercicio, apuntas las repeticiones y el peso de cada serie. Al terminar, la app guarda el entrenamiento con su duración, el número de series y el volumen total levantado.

Además, puedes crear **rutinas** (por ejemplo, *Torso / Pierna*) a partir de un catálogo común de ejercicios. Cada día de la rutina tiene un objetivo (fuerza, hipertrofia o resistencia), y la app comprueba que las series, repeticiones y descansos tengan sentido para ese objetivo.

Proyecto de la asignatura **Sistemas y Tecnologías Web** (Universidad de La Laguna, curso 2026/27).

## Demo
 
<p align="center">
  <img src="docs/img/demo.gif" alt="Recorrido por AlFallo: inicio, entrenamiento en curso registrando series, estadísticas, perfil y documentación de la API" width="800">
</p>

## Funcionalidades

**Disponibles**

- 🔐 Registro e inicio de sesión con JWT
- 👤 Perfil de usuario: consultar, editar, cambiar contraseña y eliminar la cuenta
- 📚 Catálogo de ejercicios por grupo muscular y dificultad
- 🗓️ Rutinas por días, con validación de series, repeticiones y descanso según el objetivo
- 🏋️ Entrenamiento en curso: empezar, registrar series (repeticiones y peso), terminar o descartar
- 📈 Historial de entrenamientos con duración, series y volumen calculados automáticamente
- 📖 Documentación interactiva de la API con Swagger

**Próximamente**

- 👥 Seguir a otros usuarios y feed con sus entrenamientos
- 💬 Ánimos y comentarios en los entrenamientos
- 📊 Estadísticas y récords personales
- ⏱️ Temporizador de descanso entre series

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Frontend | Astro, React, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript |
| Base de datos | MongoDB con Mongoose |
| Autenticación | JSON Web Tokens (JWT) y bcrypt |
| Documentación | Swagger (OpenAPI 3) |
| Tests | Vitest y Supertest |
| Despliegue | Render (API) y MongoDB Atlas |

## Estructura del repositorio

```text
ALFALLO/
├── client/            # Frontend (Astro + React + Tailwind)
│   ├── public/        # Imágenes y recursos estáticos
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── lib/       # Gestión de la sesión
│       └── pages/     # Cada archivo es una ruta de la web
├── server/            # API REST (Express + TypeScript)
│   ├── config/        # Variables de entorno (dev.env, test.env)
│   └── src/
│       ├── controllers/
│       ├── docs/      # Configuración de Swagger
│       ├── middlewares/
│       ├── models/    # Esquemas de Mongoose
│       ├── routes/
│       └── tests/
└── docs/img/          # Imágenes de este README
```

## Cómo ejecutarlo en local

**Requisitos:** Node.js 22 o superior y MongoDB (local o en Atlas).

**1. Clona el repositorio**

```bash
git clone https://github.com/SyTW2627/ALFALLO.git
cd ALFALLO
```

**2. Backend**

Arranca la API:

```bash
cd server
npm install
npm run dev
```

La API queda en `http://localhost:3000` y la documentación en `http://localhost:3000/api-docs`.

**3. Frontend** (en otra terminal)

```bash
cd client
npm install
npm run dev
```

La web queda en `http://localhost:4321`.

### Scripts

| Carpeta | Comando | Qué hace |
|---|---|---|
| `server` | `npm run dev` | Arranca la API y la reinicia al guardar cambios |
| `server` | `npm run build` | Compila TypeScript a `dist/` |
| `server` | `npm start` | Arranca la versión compilada |
| `server` | `npm test` | Ejecuta los tests (usa `config/test.env`) |
| `client` | `npm run dev` | Arranca la web en modo desarrollo |
| `client` | `npm run build` | Genera la versión de producción |

## API

Toda la API está documentada en **Swagger**, donde se puede probar cada endpoint desde el navegador:

- Local: `http://localhost:3000/api-docs`

| Recurso | Endpoints principales |
|---|---|
| Autenticación | `POST /api/auth/register` · `POST /api/auth/login` |
| Usuario | `GET` `PUT /api/users/profile` · `PATCH /api/users/change-password` · `DELETE /api/users/account` |
| Ejercicios | `GET` `POST /api/exercises` |
| Rutinas | `GET` `POST /api/routines` · `GET` `PUT` `DELETE /api/routines/:id` |
| Entrenamientos | `POST /api/workouts/start` · `GET` `PUT` `DELETE /api/workouts/active` · `POST /api/workouts/finish` · `GET /api/workouts/history` |

Todas las rutas, salvo el registro y el inicio de sesión, necesitan la cabecera `Authorization: Bearer <token>`.

## Metodología

Trabajamos con **Scrum** en sprints semanales, organizados en Jira con épicas, tareas estimadas en story points y un tablero con columna de pruebas. En Git, cada parte se desarrolla en su rama y se integra en `develop`. `main` se actualiza al cerrar cada sprint.

## Equipo

| | Nombre | Rol principal |
|:---:|---|---|
| 🛠️ | **Iker Martín Gámez** | Backend y base de datos |
| 🎨 | **Hugo Martín Gámez** | Frontend y diseño |
| 🔗 | **Aitor Castro Darias** | Modelo de datos e integración |