const { User, Task, Assignment } = require('./models');

// Función para mezclar arrays
const shuffle = (array) => array.sort(() => Math.random() - 0.5);

async function assignDailyTasks() {
    console.log('--- Iniciando reparto inteligente de tareas ---');

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, ...

    // Normalizar fecha
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Evitar duplicar roles de hoy
    // Nota: Solo revisamos si ya se asignaron 'roles' hoy. Las de limpieza son aparte.
    const rolesAssigned = await Assignment.findOne({
        date: { $gte: startOfDay },
        // Si quisiéramos ser estrictos, buscaríamos assignments que apuntan a tareas tipo 'role'
        // Pero por simplicidad, si ya hay assignments hoy, asumimos que corrió el cron.
    });

    if (rolesAssigned) {
        console.log('⚠️ Tareas (Roles) de hoy ya asignadas.');
        return;
    }

    // 2. Obtener usuarios DISPONIBLES (No es su día de descanso)
    const users = await User.find({ active: true });

    // Filtrar quienes descansan hoy
    const availableUsers = users.filter(u => !u.restDays.includes(dayOfWeek));

    console.log(`📅 Día: ${dayOfWeek}. Usuarios totales: ${users.length}. Disponibles: ${availableUsers.length}`);

    if (availableUsers.length === 0) { console.log('❌ Nadie trabaja hoy.'); return; }

    // 3. Obtener Tareas
    const roleTasks = await Task.find({ type: 'role' });
    const cleaningTasks = await Task.find({ type: 'cleaning' });

    const assignments = [];
    const shuffledUsers = shuffle(availableUsers);

    // --- FASE 1: ASIGNAR ROLES DIARIOS (Caja, Canje, etc) ---
    // Prioridad: Llenar puestos clave primero
    roleTasks.forEach((task, index) => {
        if (index < shuffledUsers.length) {
            const user = shuffledUsers[index];
            assignments.push({
                user: user._id,
                task: task._id,
                date: new Date(),
                deadline: new Date(new Date().setHours(23, 59, 59)), // Hoy
                status: 'pendiente',
                xpReward: task.xpReward || 100 // Más XP por roles
            });
        }
    });

    // --- FASE 2: ASIGNAR LIMPIEZA DE MÁQUINAS (Solo LUNES - Semanal) ---
    if (dayOfWeek === 1) { // 1 = Lunes
        console.log('🧹 Es LUNES: Asignando limpieza semanal...');

        // Excluir a los que ya tienen Rol (si se desea) O darles doble tarea.
        // Regla de Negocio: "Caja, Canje y Area Infantil... considerar descansos... asignación semanal" 
        // Asumiremos que los que tienen rol NO reciben máquina, O que se reparten entre todos.
        // Para balancear: Repartiremos las máquinas entre TODOS los disponibles de la semana (a la suerte).

        const nextSunday = new Date();
        nextSunday.setDate(today.getDate() + 6); // Próximo domingo

        cleaningTasks.forEach((task, index) => {
            // Rotar de nuevo usuarios para aleatoriedad
            const user = shuffledUsers[index % shuffledUsers.length];

            assignments.push({
                user: user._id,
                task: task._id,
                date: new Date(),
                deadline: nextSunday,
                status: 'pendiente',
                xpReward: task.xpReward || 50 // Menos XP por máquinas
            });
        });
    }

    // 4. Guardar
    if (assignments.length > 0) {
        await Assignment.insertMany(assignments);
        console.log(`🎲 ÉXITO: Se repartieron ${assignments.length} tareas.`);
    } else {
        console.log('ℹ️ No hubo tareas para asignar hoy.');
    }
}

// ¡ESTA LÍNEA ES LA MÁS IMPORTANTE!
module.exports = { assignDailyTasks };