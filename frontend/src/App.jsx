import { useState, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './App.css';

// Recuerda: si estás en la misma PC usa localhost. 
const API_URL = 'https://playtime-backend-1g83.onrender.com';

// --- CONFIGURACIÓN DE TIERS (Global) ---
const TIER_NAMES = {
  1: 'Elemental',
  2: 'Astral',
  3: 'Celestial',
  4: 'Cósmico',
  5: 'Universal'
};

const TIER_THEMES = {
  1: { bg: '#f5f5f5', header: '#ff5722', card: 'white' },
  2: { bg: '#1a1a2e', header: '#16213e', card: '#0f3460', text: 'white' },
  3: { bg: '#fcfbf4', header: '#d4af37', card: '#fffdf0' },
  4: { bg: '#120129', header: '#6a0572', card: '#2d1b4e', text: '#e0e0e0' },
  5: { bg: '#000000', header: '#333333', card: '#111111', text: '#f0f0f0', border: '2px solid rainbow' }
};

function App() {
  const [view, setView] = useState('login'); // 'login', 'tasks', 'admin'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]); // Tareas asignadas al usuario
  const [report, setReport] = useState([]); // Datos para el panel de control

  const [stats, setStats] = useState([]); // Nuevo estado para estadísticas
  const [adminPassword, setAdminPassword] = useState(''); // Estado para guardar el password temporalmente

  // Nuevo Estado para Detalle de Empleado
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [showLogs, setShowLogs] = useState(false); // Toggle Logs Modal
  const [systemLogs, setSystemLogs] = useState([]); // Store logs

  // Estado para gestión de tareas (CRUD)
  const [availableTasks, setAvailableTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showTasks, setShowTasks] = useState(false); // Estado para colapsar gestión de tareas
  const [editingTask, setEditingTask] = useState(null); // Estado para editar tarea

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

  const viewEmployeeDetail = (id) => {
    setSelectedEmployeeId(id);
    setView('employee_detail');
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

  const fetchLogs = () => {
    axios.get(`${API_URL}/system-logs`, {
      headers: { 'x-admin-password': adminPassword }
    }).then(res => {
      setSystemLogs(res.data);
      setShowLogs(true);
    }).catch(() => alert("Error obteniendo logs"));
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

  const saveTask = (taskId, updatedData) => {
    axios.put(`${API_URL}/tasks/${taskId}`, updatedData, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      alert("✅ Tarea actualizada");
      setEditingTask(null);
      fetchAvailableTasks(adminPassword);
    }).catch(() => alert("Error al actualizar tarea"));
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
      if (res.data.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        alert("✅ Tarea enviada a revisión. ¡Buen trabajo!");
      }
      loadTasks(currentUser._id);
    });
  };

  const approveTask = (id, e) => {
    e.stopPropagation(); // Evitar recargas si está en un form
    axios.post(`${API_URL}/approve/${id}`, {}, {
      headers: { 'x-admin-password': adminPassword }
    }).then((res) => {
      if (res.data.success) {
        alert("✅ Tarea Aprobada. Se han enviado los XP al empleado.");

        // Recargar reporte y stats
        axios.get(`${API_URL}/dashboard`, { headers: { 'x-admin-password': adminPassword } }).then(r => setReport(r.data));
        fetchStats(adminPassword);
      }
    });
  };

  const delegateTask = (assignmentId) => {
    const name = prompt("Escribe el NOMBRE EXACTO del empleado a quien delegar:");
    if (!name) return;

    // Buscar usuario por nombre (case insensitive)
    const targetUser = users.find(u => u.name.toLowerCase() === name.toLowerCase().trim());
    if (!targetUser) {
      alert("❌ Usuario no encontrado. Verifica el nombre.");
      return;
    }

    if (confirm(`¿Reasignar esta tarea a ${targetUser.name}?`)) {
      axios.put(`${API_URL}/assignments/${assignmentId}/delegate`, { newUserId: targetUser._id }, {
        headers: { 'x-admin-password': adminPassword }
      }).then(() => {
        alert("✅ Tarea reasignada correctamente.");
        axios.get(`${API_URL}/dashboard`, { headers: { 'x-admin-password': adminPassword } }).then(r => setReport(r.data));
      }).catch(err => {
        alert("Error al delegar tarea.");
      });
    }
  };

  const deleteAssignment = (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta asignación del registro?')) return;
    axios.delete(`${API_URL}/assignments/${id}`, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      // Recargar reporte y stats
      axios.get(`${API_URL}/dashboard`, { headers: { 'x-admin-password': adminPassword } }).then(r => setReport(r.data));
    }).catch(err => {
      alert("Error al eliminar asignación.");
    });
  };

  const ascendUser = () => {
    if (!currentUser) return;
    if (!confirm("¡ADVERTENCIA! Al ascender de Tier perderás toda tu XP actual y comenzarás desde 0 en el nuevo plano de existencia. Tus insignias actuales serán reemplazadas por el nuevo rango. ¿Estás listo para evolucionar?")) return;

    axios.post(`${API_URL}/ascend`, { userId: currentUser._id }).then((res) => {
      if (res.data.success) {
        confetti({ particleCount: 500, spread: 360, startVelocity: 50 }); // SUPER Confetti
        alert(`✨ ¡ASCENSIÓN COMPLETADA! Ahora eres Tier ${res.data.tier}: ${TIER_NAMES[res.data.tier] || ''}.`);
        // Recargar usuario
        axios.get(`${API_URL}/users`).then(uRes => {
          setUsers(uRes.data);
          const updatedUser = uRes.data.find(u => u._id === currentUser._id);
          setCurrentUser(updatedUser);
        });
      }
    }).catch(err => {
      alert(err.response?.data?.error || "Error al ascender.");
    });
  };

  const forceDailyAssignment = () => {
    if (!confirm('¿Estás seguro de FORZAR la asignación diaria? Esto generará tareas para todos los empleados activos según su horario. Úsalo solo si el sistema automático falló.')) return;

    axios.post(`${API_URL}/force-assign`, {}, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      alert("✅ Asignación masiva completada. Se han generado las tareas del día.");
      // Refresh report
      axios.get(`${API_URL}/dashboard`, { headers: { 'x-admin-password': adminPassword } }).then(r => setReport(r.data));
    }).catch(err => {
      alert("Error al forzar asignación.");
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  // Helper para nivel
  const getLevel = (xp) => Math.floor((xp || 0) / 200) + 1;
  const getNextLevelXp = (level) => level * 200;

  const showAbout = () => {
    alert("✨ Playtime Task Manager ✨\n\nDesarrollado con ❤️ por: Aldo Chayanne\nVersión: beta (Elemental)");
  };

  // --- VISTA 1: LOGIN ---
  if (view === 'login') {
    return (
      <div className="container">
        <div className="brand-header">
          <img
            src="https://playtime.lat/wp-content/themes/playtimewp/app/img/playtime.svg"
            alt="Playtime Logo"
            className="logo-main"
          />
          <div className="branch-tag">📍 Sucursal Coapa</div>
        </div>
        <h1>Tareas Operativas</h1>
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
        <button onClick={showAbout} className="admin-link" style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.7 }}>
          ℹ️ Acerca de
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
          <h2>📊 Reporte Operativo</h2>
          <div>
            <button onClick={fetchLogs} className="back-btn" style={{ background: '#607D8B', marginRight: '10px' }}>📜 Logs Sistema</button>
            <button onClick={() => setView('login')} className="back-btn">⬅ Salir</button>
          </div>
        </div>

        {showLogs && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3>📜 Logs de Distribución</h3>
                <button onClick={() => setShowLogs(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
              </div>
              <table className="report-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Mensaje</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {systemLogs.map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.date).toLocaleString()}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: '4px',
                          background: log.type === 'error' ? '#FFEBEE' : log.type === 'success' ? '#E8F5E9' : '#E3F2FD',
                          color: log.type === 'error' ? '#D32F2F' : log.type === 'success' ? '#388E3C' : '#1976D2',
                          fontWeight: 'bold'
                        }}>{log.type.toUpperCase()}</span>
                      </td>
                      <td>{log.message}</td>
                      <td><pre style={{ margin: 0, fontSize: '0.75rem', background: '#f5f5f5', padding: '5px' }}>{JSON.stringify(log.details, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  <th>XP Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong
                        style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                        onClick={() => viewEmployeeDetail(stat._id)}
                      >
                        {stat.name} 🔗
                      </strong>
                    </td>
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
                    <td><strong>{stat.xp} XP</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN DE GESTIÓN DE TAREAS (CRUD) */}
        <div className="management-section">
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowTasks(!showTasks)}
          >
            <h3>🛠️ Gestión de Tareas</h3>
            <span>{showTasks ? '▲ Ocultar' : '▼ Mostrar'}</span>
          </div>

          {showTasks && (
            <>
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
                      <th>Tipo/Frecuencia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableTasks.map(task => (
                      <tr key={task._id}>
                        <td>{task.title}</td>
                        <td><small>{task.type} / {task.frequency}</small></td>
                        <td>
                          <button onClick={() => setEditingTask(task)} className="delete-btn" style={{ background: '#2196F3', marginRight: '5px' }} title="Editar">
                            ✎
                          </button>
                          <button onClick={() => deleteTask(task._id)} className="delete-btn" title="Eliminar">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {editingTask && (
            <TaskEditor
              task={editingTask}
              onClose={() => setEditingTask(null)}
              onSave={saveTask}
            />
          )}
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

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={forceDailyAssignment}
            style={{ background: '#FF5722', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px', border: '2px solid #E64A19' }}
          >
            ⚠️ FORZAR ASIGNACIÓN DIARIA (CRON)
          </button>
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Presiona esto solo si las tareas no se generaron automáticamente hoy.</p>
        </div>

        <br />
        <hr />

        <h3>📅 Registro Diario</h3>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Fecha Asignada</th>
                <th>Hora Terminado</th>
                <th>Empleado</th>
                <th>Máquina</th>
                <th>XP Ganada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {report.map(log => (
                <tr key={log._id} style={{ backgroundColor: log.status === 'revision' ? '#fff3cd' : 'transparent' }}>
                  <td>
                    {log.status === 'completada' && <span style={{ color: 'green', fontWeight: 'bold' }}>✅ LISTO</span>}
                    {log.status === 'pendiente' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ color: 'orange' }}>⏳ PENDIENTE</span>
                        <button
                          style={{ fontSize: '0.8rem', padding: '5px', background: '#3F51B5', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={(e) => {
                            if (confirm('¿Forzar completado? Se dará la XP inmediatamente.')) approveTask(log._id, e);
                          }}
                        >
                          ⚡ Completar
                        </button>
                      </div>
                    )}
                    {log.status === 'revision' && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#d39e00', fontWeight: 'bold' }}>🕵️ REVISIÓN</span>
                        <button
                          style={{ fontSize: '0.8rem', padding: '5px', marginTop: '5px', background: 'green' }}
                          onClick={(e) => approveTask(log._id, e)}
                        >
                          ✅ Aprobar
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{formatDate(log.date)}</td>
                  <td className="time-cell">
                    {log.completedAt ? formatDate(log.completedAt) : '-'}
                  </td>
                  <td>
                    <strong>{log.user?.name || 'Desconocido'}</strong>
                    {log.status !== 'completada' && (
                      <button
                        onClick={() => delegateTask(log._id)}
                        style={{ fontSize: '0.7rem', marginLeft: '5px', background: '#FF9800', border: 'none', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px' }}
                        title="Reasignar Tarea"
                      >
                        🔄
                      </button>
                    )}
                  </td>
                  <td>{log.task?.title || 'Tarea borrada'}</td>
                  <td>
                    {log.status === 'completada' ?
                      <span style={{ color: 'green', fontWeight: 'bold' }}>+{log.xpReward || 50} XP</span>
                      : <span style={{ color: '#ccc' }}>{log.xpReward || 50} XP</span>}
                  </td>
                  <td>
                    <button onClick={() => deleteAssignment(log._id)} className="delete-btn" title="Eliminar del Registro">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VISTA 2.5: DETALLE DE EMPLEADO (DASHBOARD INDIVIDUAL) ---
  if (view === 'employee_detail') {
    return (
      <EmployeeDetail
        userId={selectedEmployeeId}
        adminPassword={adminPassword}
        onBack={() => setView('admin')}
      />
    );
  }

  // --- VISTA 3: TAREAS DEL EMPLEADO (CON GAMIFICATION) ---
  const currentLevel = currentUser ? getLevel(currentUser.xp) : 1;
  const currentTier = currentUser?.tier || 1;
  const theme = TIER_THEMES[currentTier] || TIER_THEMES[1];

  // Progreso hacia Ascensión (10,000 XP)
  const progressPercent = Math.min(100, Math.max(0, ((currentUser?.xp || 0) / 10000) * 100));

  const containerStyle = {
    background: theme.bg,
    minHeight: '100vh',
    color: theme.text || '#333',
    transition: 'background 0.5s ease',
    padding: '20px'
  };

  const cardStyle = {
    background: theme.card,
    color: theme.text || '#333',
    padding: '15px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    border: theme.border || 'none'
  };

  return (
    <div style={containerStyle}> {/* Replaces className="container" default style */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Hola, {currentUser.name} 👋</h2>
          <small style={{ opacity: 0.8 }}>{TIER_NAMES[currentTier]} • Nivel {currentLevel}</small>
        </div>
        <button onClick={() => setView('login')} className="back-btn" style={{ background: '#f44336' }}>⬅ Salir</button>
      </div>

      {/* GAMIFICATION HEADER */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span className="level-badge" style={{ background: theme.header || '#6200ea', color: 'white' }}>
            Tier {currentTier}: {TIER_NAMES[currentTier]}
          </span>
          <span className="xp-text">{currentUser.xp || 0} / 10,000 XP</span>
        </div>

        <div className="xp-progress-bar" style={{ background: 'rgba(0,0,0,0.1)' }}>
          <div className="xp-fill" style={{ width: `${progressPercent}%`, background: currentTier > 1 ? `linear-gradient(90deg, ${theme.header}, #00e676)` : '#4caf50' }}></div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <strong>Insignias:</strong>
          <div className="badges-container" style={{ marginTop: '5px' }}>
            {currentUser.badges && currentUser.badges.map((badge, i) => (
              <span key={i} className="badge-item" style={{ background: '#eee', color: '#333', border: '1px solid #ddd' }}>{badge}</span>
            ))}
          </div>
        </div>

        {/* ASCENSION BUTTON */}
        {currentUser.xp >= 10000 && currentTier < 5 && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p>✨ Has alcanzado el límite de este plano ✨</p>
            <button
              onClick={ascendUser}
              style={{
                background: 'linear-gradient(45deg, #FFD700, #FFEA00, #FFD700)',
                color: 'black',
                fontWeight: 'bold',
                padding: '15px 30px',
                fontSize: '1.1rem',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
                animation: 'pulse 1.5s infinite'
              }}
            >
              🌀 ASCENDER AL SIGUIENTE NIVEL 🌀
            </button>
          </div>
        )}
      </div>

      <h3 style={{ textAlign: 'left', marginTop: '20px' }}>Tus pendientes hoy:</h3>
      <div className="task-list">
        {tasks.length === 0 && <div className="empty">¡Todo limpio! 🎉 <br /><small>Has terminado todo por hoy</small></div>}

        {tasks.map(assign => (
          <div key={assign._id} className={`card ${assign.status}`} style={{ opacity: assign.status === 'revision' ? 0.7 : 1 }}>
            <div className="card-info">
              <h4>{assign.task.title}</h4>
              <small>
                {assign.status === 'completada' && '✅ Completada (+XP)'}
                {assign.status === 'revision' && '🕵️ Pendiente de Revisión'}
                {assign.status === 'pendiente' && '⏳ Pendiente (+ XP)'}
              </small>
            </div>
            {assign.status === 'pendiente' && (
              <button onClick={() => completeTask(assign._id)} className="done-btn">
                LISTO ✨
              </button>
            )}
            {assign.status === 'revision' && (
              <button disabled className="done-btn" style={{ background: '#ccc', cursor: 'not-allowed' }}>
                ⏳ En Revisión
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
  const [editingScheduleUser, setEditingScheduleUser] = useState(null);

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

  const punishUser = (id, name) => {
    const amount = prompt(`¿Cuántos XP deseas restar a ${name}? (Castigo)`);
    if (!amount) return;

    axios.post(`${API_URL}/punish`, { userId: id, amount }, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      alert(`⚡ Castigo aplicado a ${name}.`);
      refreshUsers();
      fetchStats();
    }).catch(() => alert("Error al aplicar castigo"));
  };

  const saveSchedule = (userId, newSchedule) => {
    axios.put(`${API_URL}/users/${userId}`, { weeklySchedule: newSchedule }, {
      headers: { 'x-admin-password': adminPassword }
    }).then(() => {
      alert("✅ Horario actualizado");
      setEditingScheduleUser(null);
      refreshUsers();
    }).catch(() => alert("Error al guardar horario"));
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
              <th>Horario Semanal</th>
              <th>Nivel/XP</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>
                  <button
                    onClick={() => setEditingScheduleUser(u)}
                    style={{ fontSize: '0.8rem', background: '#2196F3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📅 Editar Horario
                  </button>
                  <div style={{ fontSize: '0.7rem', marginTop: '5px', color: '#666' }}>
                    Hoy: {u.weeklySchedule ? u.weeklySchedule[new Date().getDay()] : '-'}
                  </div>
                </td>
                <td>
                  <div>{TIER_NAMES[u.tier || 1]}</div>
                  <small>Nivel {Math.floor((u.xp || 0) / 200) + 1} ({u.xp || 0} XP)</small>
                </td>
                <td>
                  <button onClick={() => punishUser(u._id, u.name)} className="delete-btn" style={{ background: '#FF5722', marginRight: '5px' }} title="Castigar (Restar XP)">
                    ⚡
                  </button>
                  <button onClick={() => deleteUser(u._id)} className="delete-btn" title="Despedir">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingScheduleUser && (
        <ScheduleEditor
          user={editingScheduleUser}
          onClose={() => setEditingScheduleUser(null)}
          onSave={saveSchedule}
        />
      )}
    </div>
  );
};

const ScheduleEditor = ({ user, onClose, onSave }) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const [schedule, setSchedule] = useState(user.weeklySchedule || Array(7).fill('descanso'));

  const handleChange = (index, value) => {
    const newSched = [...schedule];
    newSched[index] = value;
    setSchedule(newSched);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '500px' }}>
        <h3>📅 Horario de {user.name}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
          {days.map((day, i) => (
            <div key={i} style={{ marginBottom: '5px' }}>
              <strong>{day}:</strong>
              <select
                value={schedule[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                style={{ width: '100%', padding: '5px', marginTop: '3px' }}
              >
                <option value="matutino">🌅 Matutino</option>
                <option value="vespertino">🌙 Vespertino</option>
                <option value="descanso">💤 Descanso</option>
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: '#ccc', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(user._id, schedule)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Guardar Cambios</button>
        </div>
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

const EmployeeDetail = ({ userId, adminPassword, onBack }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/users/${userId}/analytics`, {
      headers: { 'x-admin-password': adminPassword }
    }).then(res => setData(res.data))
      .catch(err => alert("Error cargando datos del empleado"));
  }, [userId, adminPassword]);

  if (!data) return <div className="container">Cargando perfil...</div>;

  const { user, stats, history } = data;

  return (
    <div className="container" style={{ background: '#f8f9fa', color: '#333' }}>
      <button onClick={onBack} className="back-btn" style={{ marginBottom: '20px' }}>⬅ Volver al Reporte</button>

      <div className="profile-header" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👤</div>
        <h1 style={{ color: '#333', marginBottom: '5px' }}>{user.name}</h1>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge-item" style={{ background: '#6200ea', color: 'white' }}>Tier {user.tier}: {TIER_NAMES[user.tier]}</span>
          <span className="badge-item" style={{ background: '#FFC107', color: 'black' }}>{user.xp} XP Totales</span>
          <span className="badge-item" style={{ background: '#00C853', color: 'white' }}>{stats.percentage}% Efectividad</span>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '20px' }}>
        <div className="stat-card" style={{ background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>📅 Días</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#3F51B5' }}>{stats.daysWorked}</p>
          <small>Trabajados con actividad</small>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>✅ Tareas</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#4CAF50' }}>{stats.completedTasks}</p>
          <small>Completadas exitosamente</small>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>⚡ Total</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#FF9800' }}>{stats.totalTasks}</p>
          <small>Tareas asignadas</small>
        </div>
      </div>

      <h3 style={{ marginTop: '30px' }}>🏅 Historial de Insignias</h3>
      <div className="badges-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0' }}>
        {user.badges.length > 0 ? user.badges.map((b, i) => (
          <span key={i} style={{ padding: '8px 15px', background: '#fff', border: '1px solid #ddd', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            {b}
          </span>
        )) : <p>Sin insignias aún.</p>}
      </div>

      <h3 style={{ marginTop: '30px' }}>📜 Últimas Tareas</h3>
      <div className="table-responsive">
        <table className="report-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tarea</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h._id}>
                <td>{new Date(h.date).toLocaleDateString()}</td>
                <td>{h.task?.title || 'Tarea borrada'}</td>
                <td>
                  {h.status === 'completada' ? '✅' : h.status === 'revision' ? '🕵️' : '⏳'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

const TaskEditor = ({ task, onClose, onSave }) => {
  const [data, setData] = useState({
    title: task.title,
    description: task.description || '',
    xpReward: task.xpReward || 100,
    type: task.type || 'cleaning',
    frequency: task.frequency || 'diaria',
    shift: task.shift || 'general'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '400px' }}>
        <h3>✏️ Editar Tarea</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
          <input name="title" value={data.title} onChange={handleChange} placeholder="Título" style={{ padding: '8px' }} />
          <textarea name="description" value={data.description} onChange={handleChange} placeholder="Descripción" style={{ padding: '8px' }} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <label>XP:</label>
            <input name="xpReward" type="number" value={data.xpReward} onChange={handleChange} style={{ padding: '5px', width: '60px' }} />
          </div>

          <label>Tipo:</label>
          <select name="type" value={data.type} onChange={handleChange} style={{ padding: '8px' }}>
            <option value="cleaning">Limpieza / General</option>
            <option value="role">Rol de Turno</option>
          </select>

          <label>Frecuencia:</label>
          <select name="frequency" value={data.frequency} onChange={handleChange} style={{ padding: '8px' }}>
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
          </select>

          <label>Turno:</label>
          <select name="shift" value={data.shift} onChange={handleChange} style={{ padding: '8px' }}>
            <option value="general">General (Cualquiera)</option>
            <option value="matutino">Matutino</option>
            <option value="vespertino">Vespertino</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: '#ccc', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(task._id, data)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default App;