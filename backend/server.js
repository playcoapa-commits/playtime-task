const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const { User, Assignment, Task } = require('./models'); // Aseguramos importar Task también
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

// 3. Marcar tarea como completada
app.post('/complete/:id', async (req, res) => {
    try {
        await Assignment.findByIdAndUpdate(
            req.params.id,
            { status: 'completada', completedAt: new Date() } // Guardamos la fecha real
        );
        res.json({ success: true });
    } catch (error) {
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

// 5. Endpoint para forzar asignación (Manual)
app.post('/force-assign', async (req, res) => {
    await assignDailyTasks();
    res.send('Asignación forzada completada');
});

// --- AUTOMATIZACIÓN ---
cron.schedule('0 6 * * *', assignDailyTasks);

app.listen(3001, () => console.log('🚀 Servidor corriendo en puerto 3001'));