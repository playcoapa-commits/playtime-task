require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Task } = require('./models');

async function run() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado.');

        console.log('🔄 Actualizando XP de Area Infantil...');

        // 1. Actualizar "Area Infantil" (ambos turnos) a 50 XP
        const res = await Task.updateMany(
            { title: /Area Infantil/i },
            { $set: { xpReward: 50 } }
        );

        console.log(`✅ Resultado: ${res.modifiedCount} tareas actualizadas a 50 XP.`);

        // 2. Asegurar que las demás tengan 100 si no tienen nada (por si acaso el default no aplicó retroactivamente)
        // Nota: Mongoose defaults aplican al crear, updateMany no aplica defaults automáticamente a documentos viejos
        // así que lo hacemos manual
        const res2 = await Task.updateMany(
            { title: { $nregex: /Area Infantil/i }, type: 'role', xpReward: { $exists: false } }, // regex negado no es standard mongo query asi, mejor lo hacemos en dos pasos
            { $set: { xpReward: 100 } }
        );
        // Better query: Tasks of type role, NOT Area Infantil
        const res3 = await Task.updateMany(
            { title: { $not: /Area Infantil/i }, type: 'role', xpReward: { $exists: false } },
            { $set: { xpReward: 100 } }
        );

        console.log(`ℹ️ Otros roles actualizados (si faltaban): ${res3.modifiedCount}`);

        const tasks = await Task.find({ title: /Area Infantil/i });
        console.log('👀 Verificación:', tasks.map(t => `${t.title}: ${t.xpReward} XP`));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado.');
    }
}

run();
