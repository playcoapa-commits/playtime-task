import { useState, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './App.css';

// Recuerda: si estás en la misma PC usa localhost. 
const API_URL = 'https://playtime-backend-1g83.onrender.com';

function App() {
  const [view, setView] = useState('login'); // 'login', 'tasks', 'admin'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]); // Tareas asignadas al usuario
  const [report, setReport] = useState([]); // Datos para el panel de control

  const [stats, setStats] = useState([]); // Nuevo estado para estadísticas
  const [adminPassword, setAdminPassword] = useState(''); // Estado para guardar el password temporalmente

  // Estado para gestión de tareas (CRUD)
  const [availableTasks, setAvailableTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    axios.get(`${API_URL}/users`).then(res => setUsers(res.data));
  };

  const enterAdminMode = () => {
    const password = prompt("Ingrese contraseña de Administrador:");
    if (!password) return;

    axios.get(`${API_URL}/dashboard`, {
      headers: { 'x-admin-password': password }
    })
      .then(res => {
        setReport(res.data);
        setAdminPassword(password);
        fetchStats(password);
        fetchAvailableTasks(password); // Cargamos las tareas disponibles
        setView('admin');
      })
      .catch(err => {
        if (err.response && err.response.status === 401) {
          alert("⛔ ACCESO DENEGADO: Contraseña incorrecta");
        } else {
          alert("Error al conectar con el servidor");
        }
      });
  };

  const fetchStats = (password) => {
    axios.get(`${API_URL}/stats`, {
      headers: { 'x-admin-password': password }
    }).then(res => setStats(res.data));
  };

  const fetchAvailableTasks = (password) => {
    axios.get(`${API_URL}/tasks`, {
      headers: { 'x-admin-password': password }
    }).then(res => setAvailableTasks(res.data));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    axios.post(`${API_URL}/tasks`, { title: newTaskTitle }, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      setNewTaskTitle('');
      fetchAvailableTasks(adminPassword);
    });
  };

  const deleteTask = (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    axios.delete(`${API_URL}/tasks/${id}`, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      fetchAvailableTasks(adminPassword);
    });
  };

  const login = (user) => {
    setCurrentUser(user);
    loadTasks(user._id);
    setView('tasks');
  };

  const loadTasks = (id) => {
    axios.get(`${API_URL}/my-tasks/${id}`).then(res => setTasks(res.data));
  };

  const completeTask = (id) => {
    axios.post(`${API_URL}/complete/${id}`).then(() => {
      // Disparamos confeti al completar
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      loadTasks(currentUser._id);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  // --- VISTA 1: LOGIN ---
  if (view === 'login') {
    return (
      <div className="container">
        <h1>🧸 Play Time Tareas</h1>
        <div className="user-grid">
          {users.map(u => (
            <button key={u._id} onClick={() => login(u)} className="user-btn">
              <span>👤 {u.name}</span>
            </button>
          ))}
        </div>
        <br />
        <button onClick={enterAdminMode} className="admin-link">
          🔒 Panel de Gerencia
        </button>
      </div>
    );
  }

  // --- VISTA 2: PANEL DE CONTROL (DASHBOARD) ---
  if (view === 'admin') {
    return (
      <div className="container admin-container">
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📊 Reporte Operativo</h2>
          <button onClick={() => setView('login')} className="back-btn">⬅ Salir</button>
        </div>

        {/* SECCIÓN DE ESTADÍSTICAS */}
        <div className="stats-section">
          <h3>🏆 Rendimiento de Empleados</h3>
          <div className="table-responsive">
            <table className="report-table stats-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Tareas Totales</th>
                  <th>Completadas</th>
                  <th>Efectividad</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, idx) => (
                  <tr key={idx}>
                    <td><strong>{stat.name}</strong></td>
                    <td>{stat.total}</td>
                    <td>{stat.completed}</td>
                    <td>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar"
                          style={{ width: `${stat.percentage}%`, background: stat.percentage >= 80 ? 'linear-gradient(to right, #11998e, #38ef7d)' : 'linear-gradient(to right, #FFC107, #FF9800)' }}
                        ></div>
                        <span>{stat.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN DE GESTIÓN DE TAREAS (CRUD) */}
        <div className="management-section">
          <h3>🛠️ Gestión de Tareas</h3>

          <div className="management-form">
            <input
              type="text"
              placeholder="Nueva tarea..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button onClick={addTask} className="add-btn">Agregar Tarea</button>
          </div>

          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {availableTasks.map(task => (
                  <tr key={task._id}>
                    <td>{task.title}</td>
                    <td>
                      <button onClick={() => deleteTask(task._id)} className="delete-btn" title="Eliminar">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <br />
        <hr />

        <h3>📅 Registro Diario</h3>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Hora Terminado</th>
                <th>Empleado</th>
                <th>Máquina</th>
              </tr>
            </thead>
            <tbody>
              {report.map(log => (
                <tr key={log._id}>
                  <td>
                    {log.status === 'completada' ? <span style={{ color: 'green' }}>✅ LISTO</span> : <span style={{ color: 'orange' }}>⏳ PENDIENTE</span>}
                  </td>
                  <td className="time-cell">
                    {log.status === 'completada' ? formatDate(log.completedAt) : '-'}
                  </td>
                  <td><strong>{log.user?.name || 'Desconocido'}</strong></td>
                  <td>{log.task?.title || 'Tarea borrada'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VISTA 3: TAREAS DEL EMPLEADO ---
  return (
    <div className="container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Hola, {currentUser.name} 👋</h2>
        <button onClick={() => setView('login')} className="back-btn">⬅ Salir</button>
      </div>

      <h3 style={{ textAlign: 'left' }}>Tus pendientes hoy:</h3>
      <div className="task-list">
        {tasks.length === 0 && <div className="empty">¡Todo limpio! 🎉 <br /><small>Has terminado todo por hoy</small></div>}

        {tasks.map(assign => (
          <div key={assign._id} className={`card ${assign.status}`}>
            <div className="card-info">
              <h4>{assign.task.title}</h4>
              <small>{assign.status === 'completada' ? '✅ Tarea Completada' : '⏳ Pendiente de realizar'}</small>
            </div>
            {assign.status === 'pendiente' && (
              <button onClick={() => completeTask(assign._id)} className="done-btn">
                LISTO ✨
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;