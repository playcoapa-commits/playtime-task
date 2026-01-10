# 🧸 Play Time Task Manager (v2.0: Elemental Evolution)

Sistema integral de **Gestión Operativa** y **Gamificación Avanzada** para la sucursal Playtime Coapa. Este sistema automatiza la asignación de roles, limpieza de máquinas y motiva al personal mediante un sistema de progresión RPG "Skyrim-style".

## 🌌 Novedad: Evolución Elemental
El sistema ahora cuenta con **5 Planos de Existencia (Tiers)**. Los empleados comienzan en el plano Elemental y deben "Ascender" para desbloquear nuevos temas visuales e insignias.

| Tier | Nombre | Meta XP | Tema Visual |
| :--- | :--- | :--- | :--- |
| **1** | **Elemental** | 10,000 | Fuego/Tierra (Básico) |
| **2** | **Astral** | 10,000 | Espacio Profundo (Azul Oscuro) |
| **3** | **Celestial** | 10,000 | Divino (Dorado/Blanco) |
| **4** | **Cósmico** | 10,000 | Neón (Púrpura/Cyberpunk) |
| **5** | **Universal** | ∞ | Infinito (Arcoíris/Negro) |

**🌀 La Ascensión**: Al llegar a 10,000 XP, el usuario puede pulsar el botón de "Ascender". Esto **reinicia su XP a 0** pero sube su Tier (+1) y desbloquea el siguiente set de insignias.

---

## 🚀 Funcionalidades Principales

### 📋 Gestión Operativa
*   **Asignación Automática Inteligente**: El sistema asigna roles diarios (Caja, Canje, etc.) basándose en el **Horario Semanal** de cada empleado (Matutino/Vespertino).
*   **Limpieza Semanal**: Distribuye la limpieza de las 60+ máquinas recreativas equitativamente.
*   **Registro Diario**: Panel para ver quién hizo qué, a qué hora, y validar las tareas.
*   **Delegación**: Los gerentes pueden reasignar tareas si alguien falta.

### 🎮 Gamificación (XP)
*   **Roles Diarios**: +100 XP.
*   **Limpieza de Máquina**: +50 XP.
*   **Castigos**: Los gerentes pueden restar XP (⚡ Botón de Castigo) por mal comportamiento.
*   **Insignias**: 5 Rangos por Tier (ej: Polvo Estelar, Supernova, etc.).

### 📊 Reporte Gerencial
*   **Dashboard**: Vista en tiempo real del cumplimiento de tareas.
*   **Estadísticas**: Tabla de rendimiento con % de efectividad y XP Total acumulada.
*   **Limpieza**: Botón 🗑️ para eliminar tareas erróneas del registro.

---

## 🛠️ Guía Técnica

### Estructura del Proyecto
*   **/backend**: Servidor Node.js + Express + MongoDB.
    *   `server.js`: API REST y Lógica de Tiers (`TIERS_CONFIG`).
    *   `logic.js`: Algoritmo de asignación de turnos (`assignDailyTasks`).
    *   `_DANGEROUS_seed_reset.js`: **PELIGRO**. Reinicia la base de datos a cero. Requiere `--force`.
    *   `update_db.js` (Planeado): Para agregar máquinas sin borrar datos.
*   **/frontend**: React + Vite (Single Page Application).
    *   `App.jsx`: Contiene toda la lógica de UI, temas dinámicos y rutas.

### Instalación y Despliegue

**1. Requisitos**
*   Node.js v18+
*   MongoDB (URI en `.env`)

**2. Instalación Local**
```bash
# Backend
cd backend
npm install
# Crear archivo .env en raiz con: MONGO_URI=...

# Frontend
cd frontend
npm install
```

**3. Ejecución**
```bash
# Terminal 1 (Backend)
cd backend && npm start

# Terminal 2 (Frontend)
cd frontend && npm run dev
```

### 🔑 Credenciales (Hardcoded)
*   **Admin Password**: `admin123` (Modificar `server.js` para cambiarla).

### 🛡️ Seguridad de Datos
*   El código de despliegue **NO** borra la base de datos.
*   El script de `seed` ha sido desactivado y renombrado para evitar accidentes.

---
*Desarrollado para Playtime Coapa - 2026*
