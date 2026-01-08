const mongoose = require('mongoose');

// 1. Esquema de Usuario
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, default: 'general' },
    active: { type: Boolean, default: true },
    xp: { type: Number, default: 0 },
    badges: { type: [String], default: ['🌱 Novato'] },
    restDays: { type: [Number], default: [] } // 0=Domingo, 1=Lunes, etc.
});

// 2. Esquema de Tarea
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    requiredRole: { type: String, default: null },
    frequency: { type: String, default: 'diaria' },
    type: { type: String, enum: ['role', 'cleaning'], default: 'cleaning' } // 'role' = Puesto diario, 'cleaning' = Limpieza semanal
});

// 3. Esquema de Asignación (ACTUALIZADO)
const assignmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    date: { type: Date, default: Date.now },
    deadline: { type: Date }, // Fecha límite (Domingo para limpieza)
    status: { type: String, enum: ['pendiente', 'revision', 'completada'], default: 'pendiente' },
    completedAt: { type: Date },
    xpReward: { type: Number, default: 50 } // Valor de XP personalizado
});

// Exportar
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = { User, Task, Assignment };