require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { assignDailyTasks } = require('./logic');

async function run() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado.');

        console.log('🚀 Forzando asignación de tareas...');
        await assignDailyTasks(true); // Force = true

        console.log('🏁 Proceso terminado.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado.');
    }
}

run();
