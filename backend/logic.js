const { User, Task, Assignment } = require('./models');

// Función para mezclar arrays
const shuffle = (array) => array.sort(() => Math.random() - 0.5);

async function assignDailyTasks() {
    console.log('--- Iniciando reparto de tareas ---');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Evitar duplicar
    const exists = await Assignment.findOne({ date: { $gte: startOfDay } });
    if (exists) {
        console.log('⚠️ Tareas de hoy ya asignadas.');
        return;
    }

    // 2. Buscar empleados y tareas
    const users = await User.find({ active: true });
    const tasks = await Task.find({});

    if (users.length === 0) { console.log('No hay usuarios activos'); return; }

    // 3. Barajar
    const shuffledUsers = shuffle(users);
    const assignments = [];

    // 4. Repartir
    tasks.forEach((task, index) => {
        const user = shuffledUsers[index % shuffledUsers.length];
        assignments.push({
            user: user._id,
            task: task._id,
            date: new Date(),
            status: 'pendiente'
        });
    });

    // 5. Guardar
    await Assignment.insertMany(assignments);
    console.log(`🎲 ÉXITO: Se repartieron ${assignments.length} tareas.`);
}

// ¡ESTA LÍNEA ES LA MÁS IMPORTANTE!
module.exports = { assignDailyTasks };