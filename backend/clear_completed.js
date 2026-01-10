require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Assignment } = require('./models');

async function run() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado.');

        // Por defecto borra SOLO las de HOY para no afectar historial antiguo
        // Si quisieran borrar todo el historial, quitar el filtro de fecha
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        console.log('🧹 Buscando tareas COMPLETADAS de HOY para eliminar...');

        const result = await Assignment.deleteMany({
            status: 'completada',
            date: { $gte: startOfDay }
        });

        console.log(`✅ Eliminadas ${result.deletedCount} tareas completadas.`);
        console.log('ℹ️ Nota: Esto las elimina del historial y de las estadísticas.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado.');
    }
}

run();
