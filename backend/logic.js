const { User, Task, Assignment, SystemLog } = require('./models');

// Función para mezclar arrays
const shuffle = (array) => array.sort(() => Math.random() - 0.5);

async function assignDailyTasks(force = false) {
    console.log(`--- Iniciando reparto inteligente de tareas (Turnos) [Force: ${force}] ---`);

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, ...

    // Normalizar fecha
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Evitar duplicar roles de hoy (Salvo que sea forzado)
    if (!force) {
        const rolesAssigned = await Assignment.findOne({
            date: { $gte: startOfDay },
            // Simple check: si ya hay assignments hoy, abortamos.
        });

        if (rolesAssigned) {
            console.log('⚠️ Tareas (Roles) de hoy ya asignadas.');
            await SystemLog.create({
                type: 'info',
                message: 'Intento de reparto duplicado',
                details: { reason: 'Las tareas ya habían sido asignadas hoy.' }
            });
            return;
        }
    }

    // 2. Obtener usuarios ACTIVOS
    const users = await User.find({ active: true });

    // Filtrar por horario del día actual
    // u.weeklySchedule[dayOfWeek] nos da: 'matutino', 'vespertino', 'descanso'
    const workingUsers = users.filter(u => u.weeklySchedule[dayOfWeek] !== 'descanso');

    console.log(`📅 Día: ${dayOfWeek}. Usuarios totales: ${users.length}. Trabajando hoy: ${workingUsers.length}`);

    if (workingUsers.length === 0) {
        console.log('❌ Nadie trabaja hoy.');
        await SystemLog.create({
            type: 'error',
            message: 'Sin personal activo hoy',
            details: { day: dayOfWeek, totalUsers: users.length }
        });
        return;
    }

    // Separar por turnos
    const morningUsers = workingUsers.filter(u => u.weeklySchedule[dayOfWeek] === 'matutino');
    const eveningUsers = workingUsers.filter(u => u.weeklySchedule[dayOfWeek] === 'vespertino');

    console.log(`   🌅 Matutino: ${morningUsers.length} | 🌙 Vespertino: ${eveningUsers.length}`);

    // 3. Obtener Tareas de ROL separadas por turno
    const morningRoles = await Task.find({ type: 'role', shift: 'matutino' });
    const eveningRoles = await Task.find({ type: 'role', shift: 'vespertino' });

    const assignments = [];

    // --- FASE 1: ASIGNAR ROLES POR TURNO ---

    const assignRoles = (staff, tasks) => {
        const shuffledStaff = shuffle([...staff]);
        tasks.forEach((task, index) => {
            if (index < shuffledStaff.length) {
                const user = shuffledStaff[index];
                assignments.push({
                    user: user._id,
                    task: task._id,
                    date: new Date(),
                    deadline: new Date(new Date().setHours(23, 59, 59)),
                    status: 'pendiente',
                    xpReward: task.xpReward || 100
                });
            }
        });
    };

    assignRoles(morningUsers, morningRoles);
    assignRoles(eveningUsers, eveningRoles);

    // --- FASE 2: SE ASIGNA LIMPIEZA DE MÁQUINAS (Solo LUNES - Semanal) ---
    if (dayOfWeek === 1) { // 1 = Lunes
        console.log('🧹 Es LUNES: Asignando limpieza semanal...');
        const cleaningTasks = await Task.find({ type: 'cleaning' });

        // Repartir entre TODOS los que trabajan hoy (morning + evening)
        const allStaff = shuffle([...workingUsers]);

        if (allStaff.length > 0) {
            const nextSunday = new Date();
            nextSunday.setDate(today.getDate() + 6); // Próximo domingo
            nextSunday.setHours(23, 59, 59);

            cleaningTasks.forEach((task, index) => {
                // Round-robin
                const user = allStaff[index % allStaff.length];
                assignments.push({
                    user: user._id,
                    task: task._id,
                    date: new Date(),
                    deadline: nextSunday,
                    status: 'pendiente',
                    xpReward: task.xpReward || 50
                });
            });
        }
    }

    // 4. Guardar
    if (assignments.length > 0) {
        await Assignment.insertMany(assignments);
        console.log(`🎲 ÉXITO: Se repartieron ${assignments.length} tareas.`);

        await SystemLog.create({
            type: 'success',
            message: 'Reparto de tareas completado',
            details: {
                totalAssigned: assignments.length,
                morningStaff: morningUsers.length,
                eveningStaff: eveningUsers.length
            }
        });

    } else {
        console.log('ℹ️ No hubo tareas para asignar hoy (o falta personal).');
        await SystemLog.create({
            type: 'info',
            message: 'No se generaron tareas',
            details: { reason: 'Posible falta de roles o personal disponible.' }
        });
    }
}

module.exports = { assignDailyTasks };