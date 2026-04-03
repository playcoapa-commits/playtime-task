require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const { User, Assignment, Task, SystemLog } = require('./models');

// --- CONFIGURACIÓN DE TIERS Y BADGES ---
const TIERS_CONFIG = {
    1: { name: 'Elemental', badges: { 0: '🌱 La Chispa', 500: '🥉 La Flama Creciente', 2000: '🥈 La Ola de Energía', 5000: '🥇 El Núcleo Solar', 10000: '💎 El Prisma Maestro' } },
    2: { name: 'Astral', badges: { 0: '🌌 Polvo Estelar', 2000: '☄️ Llamarada Solar', 4000: '🌊 Nebulosa Fluyente', 7000: '🌟 Púlsar Dorado', 10000: '🌈 Quásar Prismático' } },
    3: { name: 'Celestial', badges: { 0: '🕊️ Luz Divina', 2000: '🔥 Fuego Sagrado', 4000: '🌬️ Aliento Creador', 7000: '👼 Halo Radiante', 10000: '👑 Corona de Cristal' } },
    4: { name: 'Cósmico', badges: { 0: '⚛️ Singularidad', 2000: '💥 Supernova', 4000: '🌀 Vórtice Temporal', 7000: '🌌 Núcleo Galáctico', 10000: '🕳️ Matriz Universal' } },
    5: { name: 'Universal', badges: { 0: '🎆 Partícula Primordial', 2000: '🌌 Expansión Inicial', 4000: '🕸️ Tejido del Espacio', 7000: '🪐 Multiverso', 10000: '♾️ La Fuente' } }
};

const getBadge = (tier, xp) => {
    const tierConfig = TIERS_CONFIG[tier] || TIERS_CONFIG[1];
    let earnedBadge = null;
    // Encontrar la insignia de mayor rango alcanzada
    const thresholds = Object.keys(tierConfig.badges).map(Number).sort((a, b) => a - b);
    for (let t of thresholds) {
        if (xp >= t) earnedBadge = tierConfig.badges[t];
    }
    return earnedBadge;
};
const { assignDailyTasks } = require('./logic');

const app = express();
app.use(cors());
app.use(express.json());

// -- RUTA HEALTH CHECK PARA QUE NO SE DUERMA ---
app.get('/health', (req, res) => {
    res.json({ status: 'alive', message: 'I am awake!' });
});

// Conexión a Mongo
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🔌 MongoDB Conectado'))
    .catch(err => console.error('Error Mongo:', err));

// --- RUTAS (API) ---

// 1. Obtener lista de empleados
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({ active: true });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// 2. Ver mis tareas de HOY
app.get('/my-tasks/:userId', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const tasks = await Assignment.find({
            user: req.params.userId,
            $or: [
                { date: { $gte: startOfDay } },       // Tareas de hoy (todas)
                { status: { $ne: 'completada' } }     // Tareas pendientes o revisión (históricas)
            ]
        }).populate('task');

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// 4. COMPLETAR TAREA (Paso 1: En Revisión)
app.post('/complete/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Asignación no encontrada' });

        assignment.status = 'revision';
        assignment.completedAt = new Date();
        await assignment.save();

        res.json({ success: true, status: 'revision', message: 'Tarea enviada a revisión' });
    } catch (err) {
        res.status(500).json({ error: 'Error al completar tarea' });
    }
});

// 4.1 APROBAR TAREA (Paso 2: Confirmar y dar XP)
app.post('/approve/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Asignación no encontrada' });

        if (assignment.status === 'completada') {
            return res.json({ success: true, message: 'Ya estaba completada' });
        }

        assignment.status = 'completada';
        await assignment.save();

        // Lógica de Gamificación (XP)
        const user = await User.findById(assignment.user);
        if (user) {
            user.xp += (assignment.xpReward || 50); // XP Personalizada o defecto 50

            // Gamificación: Insignias basada en Tier y XP
            const currentBadge = getBadge(user.tier || 1, user.xp);

            // Si el usuario merece una insignia que no tiene en su lista, la agregamos
            // Nota: En este nuevo sistema, podríamos querer mostrar SOLO la insignia actual de mayor rango, 
            // o mantener el historial. Para simplificar visualmente mostraremos "Rangos" acumulados del tier actual.

            if (currentBadge && !user.badges.includes(currentBadge)) {
                user.badges.push(currentBadge);
            }

            await user.save();

            return res.json({
                success: true,
                xp: user.xp,
                tier: user.tier || 1,
                lastBadge: currentBadge,
                allBadges: user.badges
            });
        }

        res.json({ success: true, xp: 0, newBadges: [] });
    } catch (err) {
        res.status(500).json({ error: 'Error al completar tarea' });
    }
});

const ADMIN_PASSWORD = 'admin123';

// 4. NUEVO: REPORTE GERENCIAL (DASHBOARD) - CON PASSWORD
app.get('/dashboard', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
        const logs = await Assignment.find()
            .populate('user')
            .populate('task')
            .sort({ date: -1 }); // Las más recientes primero
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el reporte' });
    }
});

// 4.1. NUEVO: ESTADÍSTICAS DE RENDIMIENTO
app.get('/stats', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
        const users = await User.find({ active: true });
        const stats = [];

        for (const user of users) {
            const total = await Assignment.countDocuments({ user: user._id });
            const completed = await Assignment.countDocuments({ user: user._id, status: 'completada' });
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            stats.push({
                _id: user._id, // Added ID for frontend linking
                name: user.name,
                total,
                completed,
                percentage,
                xp: user.xp || 0,
                tier: user.tier || 1
            });
        }

        // Ordenar por mejor porcentaje
        stats.sort((a, b) => b.percentage - a.percentage);

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// 4.1.5 NUEVO: ANALÍTICAS DETALLADAS DE EMPLEADO
app.get('/users/:id/analytics', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Tareas del usuario
        const assignments = await Assignment.find({ user: userId })
            .populate('task')
            .sort({ date: -1 });

        const totalTasks = assignments.length;
        const completedTasks = assignments.filter(a => a.status === 'completada').length;

        // Días trabajados (fechas únicas de asignaciones)
        const uniqueDates = new Set(assignments.map(a => new Date(a.date).toDateString()));
        const daysWorked = uniqueDates.size;

        // Historial reciente (últimas 10)
        const history = assignments.slice(0, 10);

        res.json({
            user: {
                name: user.name,
                tier: user.tier || 1,
                xp: user.xp || 0,
                badges: user.badges || [],
                joinedAt: user._id.getTimestamp()
            },
            stats: {
                totalTasks,
                completedTasks,
                percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                daysWorked
            },
            history
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo analíticas' });
    }
});

// 4.2. GESTIÓN DE TAREAS (CRUD)
app.get('/tasks', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const tasks = await Task.find({});
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

app.put('/tasks/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { title, description, xpReward, frequency, type, shift } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, {
            title, description, xpReward, frequency, type, shift
        }, { new: true });
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
});

app.post('/tasks', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { title, description } = req.body;
        const newTask = new Task({ title, description });
        await newTask.save();
        res.json(newTask);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear tarea' });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar tarea' });
    }
});

// 4.3. GESTIÓN DE EMPLEADOS (CRUD)
app.post('/users', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Nombre requerido' });

        const newUser = new User({ name, role: 'general' });
        await newUser.save();
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

app.put('/users/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { name, weeklySchedule, role, active } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            name, weeklySchedule, role, active
        }, { new: true });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/users/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        await User.findByIdAndDelete(req.params.id);
        // Opcional: Borrar asignaciones del usuario eliminado
        await Assignment.deleteMany({ user: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// 4.4. NUEVO: CASTIGAR (RESTAR XP)
app.post('/punish', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { userId, amount } = req.body;
        if (!userId || !amount) return res.status(400).json({ error: 'Faltan datos' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Restar XP (sin bajar de 0)
        user.xp = Math.max(0, (user.xp || 0) - Number(amount));
        await user.save();

        res.json({ success: true, newXp: user.xp });
    } catch (err) {
        res.status(500).json({ error: 'Error al aplicar castigo' });
    }
});

// 4.5. NUEVO: ELIMINAR ASIGNACIÓN/TAREA ESPECÍFICA (Registro Diario)
app.delete('/assignments/:id', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Asignación eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar asignación' });
    }
});

// 4.6. ASCENDER DE TIER
app.post('/ascend', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (user.xp < 10000) {
            return res.status(400).json({ error: 'Aún no tienes suficiente XP para ascender.' });
        }
        if ((user.tier || 1) >= 5) {
            return res.status(400).json({ error: 'Has alcanzado el máximo nivel de existencia.' });
        }

        // Ascensión
        user.tier = (user.tier || 1) + 1;
        user.xp = 0; // Reset XP

        // Asignar primera insignia del nuevo tier
        const newBadge = TIERS_CONFIG[user.tier].badges[0];
        user.badges = [newBadge]; // Reset badges to new tier start? Or keep history?
        // Let's Keep history clean per tier for now to avoid clutter, or maybe append?
        // User request implied "New set of badges". 
        // Vamos a REINICIAR las badges para que se vea limpio el progreso del nuevo Tier.

        await user.save();
        res.json({ success: true, tier: user.tier, badge: newBadge });

    } catch (err) {
        res.status(500).json({ error: 'Error en la ascensión' });
    }
});

// 4.7. REINICIAR XP A CERO (ADMIN)
app.post('/admin/reset-xp', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });

    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        user.xp = 0;
        user.tier = 1;
        user.badges = [TIERS_CONFIG[1].badges[0]]; // Insignia base elemental
        await user.save();

        res.json({ success: true, message: 'XP e Historial reiniciados a Nivel 1' });
    } catch (err) {
        res.status(500).json({ error: 'Error al reiniciar XP' });
    }
});

// 4.8. FORZAR ASCENSIÓN (ADMIN)
app.post('/admin/force-ascend', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });

    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if ((user.tier || 1) >= 5) {
            return res.status(400).json({ error: 'El usuario ya ha alcanzado el nivel máximo (Tier 5).' });
        }

        user.tier = (user.tier || 1) + 1;
        user.xp = 0;
        const newBadge = TIERS_CONFIG[user.tier].badges[0];
        user.badges = [newBadge];

        await user.save();
        res.json({ success: true, message: `Ascendido correctamente a Tier ${user.tier}` });
    } catch (err) {
        res.status(500).json({ error: 'Error al forzar ascensión' });
    }
});

// 5. ASIGNACIÓN MANUAL DE TAREAS
app.post('/assign', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const { userId, taskId, xp } = req.body;
        if (!userId || !taskId) return res.status(400).json({ error: 'Faltan datos' });

        const assignment = new Assignment({
            user: userId,
            task: taskId,
            date: new Date(), // Asignada ahora mismo
            xpReward: xp || 50 // XP que el usuario decida o 50 por defecto
        });

        await assignment.save();
        res.json({ success: true, assignment });
    } catch (err) {
        res.status(500).json({ error: 'Error al asignar tarea' });
    }
});

// 5.1 DELEGAR / REASIGNAR TAREA
app.put('/assignments/:id/delegate', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
        const { newUserId } = req.body;
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Asignación no encontrada' });

        assignment.user = newUserId;
        await assignment.save();

        res.json({ success: true, message: 'Tarea reasignada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al reasignar' });
    }
});

// 6. Endpoint para forzar asignación (Manual)
app.post('/force-assign', async (req, res) => {
    await assignDailyTasks(true);
    res.send('Asignación forzada completada');
});

// 7. LOGS DEL SISTEMA
app.get('/system-logs', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    try {
        const logs = await SystemLog.find().sort({ date: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

// --- AUTOMATIZACIÓN ---
cron.schedule('0 6 * * *', assignDailyTasks);

app.listen(3001, () => console.log('🚀 Servidor corriendo en puerto 3001'));