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
    axios.post(`${API_URL}/complete/${id}`).then((res) => {
      // Actualizar usuario local con nueva XP y medallas
      if (res.data.success && currentUser) {
        setCurrentUser(prev => ({
          ...prev,
          xp: res.data.xp,
          badges: res.data.allBadges
        }));

        // Si ganó una nueva insignia, mostramos alerta especial
        if (res.data.newBadges && res.data.newBadges.length > 0) {
          alert(`🎉 ¡FELICIDADES! Has desbloqueado: ${res.data.newBadges.join(', ')}`);
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        } else {
          // Confeti normal por completar tarea
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
      loadTasks(currentUser._id);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  // Helper para nivel
  const getLevel = (xp) => Math.floor((xp || 0) / 1000) + 1;
  const getNextLevelXp = (level) => level * 1000;

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

        {/* SECCIÓN DE GESTIÓN DE PERSONAL (CRUD) */}
        <EmployeeManagement
          users={users}
          adminPassword={adminPassword}
          refreshUsers={loadUsers}
          fetchStats={() => fetchStats(adminPassword)}
        />

        <br />
        <hr />

        {/* SECCIÓN DE ASIGNACIÓN MANUAL */}
        <ManualAssignment
          users={users}
          tasks={availableTasks}
          adminPassword={adminPassword}
        />

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

  // --- VISTA 3: TAREAS DEL EMPLEADO (CON GAMIFICATION) ---
  const level = currentUser ? getLevel(currentUser.xp) : 1;
  const nextLevelXp = getNextLevelXp(level);
  const currentLevelBaseXp = getNextLevelXp(level - 1);
  const progressPercent = currentUser ? Math.min(100, Math.max(0, ((currentUser.xp || 0) - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp) * 100)) : 0;

  return (
    <div className="container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2>Hola, {currentUser.name} 👋</h2>
        <button onClick={() => setView('login')} className="back-btn">⬅ Salir</button>
      </div>

      {/* GAMIFICATION HEADER */}
      <div className="user-level-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="level-badge">Nivel {level}</span>
          <span className="xp-text">{currentUser.xp || 0} / {nextLevelXp} XP</span>
        </div>
        <div className="xp-progress-bar">
          <div className="xp-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        {currentUser.badges && currentUser.badges.length > 0 && (
          <div className="badges-container">
            {currentUser.badges.map((badge, i) => (
              <span key={i} className="badge-item">{badge}</span>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ textAlign: 'left', marginTop: '20px' }}>Tus pendientes hoy:</h3>
      <div className="task-list">
        {tasks.length === 0 && <div className="empty">¡Todo limpio! 🎉 <br /><small>Has terminado todo por hoy</small></div>}

        {tasks.map(assign => (
          <div key={assign._id} className={`card ${assign.status}`}>
            <div className="card-info">
              <h4>{assign.task.title}</h4>
              <small>{assign.status === 'completada' ? '✅ Tarea Completada' : '⏳ Pendiente de realizar (+50 XP)'}</small>
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

const EmployeeManagement = ({ users, adminPassword, refreshUsers, fetchStats }) => {
  const [newUserName, setNewUserName] = useState('');

  const addUser = () => {
    if (!newUserName.trim()) return;
    axios.post(`${API_URL}/users`, { name: newUserName }, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      setNewUserName('');
      refreshUsers();
      fetchStats();
    }).catch(err => alert("Error al agregar usuario"));
  };

  const deleteUser = (id) => {
    if (!confirm('¿Seguro que deseas despedir a este empleado? Se borrará su historial.')) return;
    axios.delete(`${API_URL}/users/${id}`, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      refreshUsers();
      fetchStats();
    }).catch(err => alert("Error al eliminar usuario"));
  };

  return (
    <div className="management-section" style={{ marginTop: '20px' }}>
      <h3>👥 Gestión de Personal</h3>

      <div className="management-form">
        <input
          type="text"
          placeholder="Nuevo empleado..."
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
        />
        <button onClick={addUser} className="add-btn" style={{ background: '#673AB7' }}>Contratar</button>
      </div>

      <div className="table-responsive">
        <table className="report-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nivel/XP</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>Nivel {Math.floor((u.xp || 0) / 1000) + 1} ({u.xp || 0} XP)</td>
                <td>
                  <button onClick={() => deleteUser(u._id)} className="delete-btn" title="Despedir">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManualAssignment = ({ users, tasks, adminPassword }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [xpReward, setXpReward] = useState(50);

  const assignTask = () => {
    if (!selectedUser || !selectedTask) return alert("Selecciona empleado y tarea");

    axios.post(`${API_URL}/assign`, {
      userId: selectedUser,
      taskId: selectedTask,
      xp: xpReward
    }, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      alert("✅ Tarea asignada correctamente");
      setSelectedUser('');
      setSelectedTask('');
      setXpReward(50);
    }).catch(err => alert("Error al asignar tarea"));
  };

  return (
    <div className="management-section" style={{ marginTop: '20px', borderTop: '2px dashed #ccc', paddingTop: '20px' }}>
      <h3>✨ Asignación Manual y Especial</h3>
      <p style={{ marginBottom: '10px' }}>Asigna tareas específicas con recompensas personalizadas.</p>

      <div className="management-form" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }}>
          <option value="">Seleccionar Empleado...</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>

        <select value={selectedTask} onChange={e => setSelectedTask(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }}>
          <option value="">Seleccionar Tarea...</option>
          {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label>XP Recompensa:</label>
          <input
            type="number"
            value={xpReward}
            onChange={e => setXpReward(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </div>

        <button onClick={assignTask} className="add-btn" style={{ background: 'linear-gradient(45deg, #FF512F, #DD2476)' }}>
          ⭐ Asignar Tarea Especial
        </button>
      </div>
    </div>
  );
};

export default App;