import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Recuerda: si estás en la misma PC usa localhost. 
const API_URL = 'http://localhost:3001';

function App() {
  const [view, setView] = useState('login'); // 'login', 'tasks', 'admin'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [report, setReport] = useState([]); // Datos para el panel de control

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    axios.get(`${API_URL}/users`).then(res => setUsers(res.data));
  };

  const enterAdminMode = () => {
    axios.get(`${API_URL}/dashboard`).then(res => {
      setReport(res.data);
      setView('admin');
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
              {u.name}
            </button>
          ))}
        </div>
        <br />
        <hr />
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
        <div className="header">
          <h2>📊 Reporte Operativo</h2>
          <button onClick={() => setView('login')} className="back-btn">Salir</button>
        </div>

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
                <tr key={log._id} className={log.status}>
                  <td>
                    {log.status === 'completada' ? '✅ LISTO' : '⏳ PENDIENTE'}
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
      <div className="header">
        <h2>Hola, {currentUser.name} 👋</h2>
        <button onClick={() => setView('login')} className="back-btn">Salir</button>
      </div>

      <h3>Tus pendientes hoy:</h3>
      <div className="task-list">
        {tasks.length === 0 && <p className="empty">¡Todo limpio! 🎉</p>}

        {tasks.map(assign => (
          <div key={assign._id} className={`card ${assign.status}`}>
            <div className="card-info">
              <h4>{assign.task.title}</h4>
              <small>{assign.status === 'completada' ? '✅ Completada' : '⏳ Pendiente'}</small>
            </div>
            {assign.status === 'pendiente' && (
              <button onClick={() => completeTask(assign._id)} className="done-btn">
                LISTO
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;