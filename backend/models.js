const mongoose = require('mongoose');

// 1. Esquema de Usuario
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, default: 'general' },
    active: { type: Boolean, default: true }
});

// 2. Esquema de Tarea
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    requiredRole: { type: String, default: null },
    frequency: { type: String, default: 'diaria' }
});

// 3. Esquema de Asignación (ACTUALIZADO)
const assignmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pendiente', 'completada'], default: 'pendiente' },
    completedAt: { type: Date } // <--- ¡ESTA ES LA LÍNEA QUE FALTABA!
});

// Exportar
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = { User, Task, Assignment };