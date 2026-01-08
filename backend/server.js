const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const { User, Assignment, Task } = require('./models');
const { assignDailyTasks } = require('./logic');

const app = express();
app.use(cors());
app.use(express.json());

// -- RUTA HEALTH CHECK PARA QUE NO SE DUERMA ---
app.get('/health', (req, res) => {
    res.json({ status: 'alive', message: 'I am awake!' });
});

// Conexión a Mongo
mongoose.connect('mongodb+srv://playcoapa:Coapa051@cluster0.gwa8ril.mongodb.net/?appName=Cluster0')
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
            date: { $gte: startOfDay }
        }).populate('task');

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// 4. COMPLETAR TAREA (Gamificación)
app.post('/complete/:id', async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Asignación no encontrada' });

        assignment.status = 'completada';
        assignment.completedAt = new Date();
        await assignment.save();

        // Lógica de Gamificación
        const user = await User.findById(assignment.user);
        if (user) {
            user.xp += (assignment.xpReward || 50); // XP Personalizada o defecto 50

            // Insignias
            const badges = user.badges || [];
            if (!badges.includes('🌱 Novato')) user.badges = ['🌱 Novato'];
            const newBadges = [];

            if (user.xp >= 500 && !user.badges.includes('🥉 Bronce')) newBadges.push('🥉 Bronce');
            if (user.xp >= 2000 && !user.badges.includes('🥈 Plata')) newBadges.push('🥈 Plata');
            if (user.xp >= 5000 && !user.badges.includes('🥇 Oro')) newBadges.push('🥇 Oro');
            if (user.xp >= 10000 && !user.badges.includes('💎 Diamante')) newBadges.push('💎 Diamante');

            if (newBadges.length > 0) {
                user.badges = [...user.badges, ...newBadges];
            }
            await user.save();

            return res.json({
                success: true,
                xp: user.xp,
                newBadges,
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
                name: user.name,
                total,
                completed,
                percentage
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

// 6. Endpoint para forzar asignación (Manual)
app.post('/force-assign', async (req, res) => {
    await assignDailyTasks();
    res.send('Asignación forzada completada');
});

// --- AUTOMATIZACIÓN ---
cron.schedule('0 6 * * *', assignDailyTasks);

app.listen(3001, () => console.log('🚀 Servidor corriendo en puerto 3001'));