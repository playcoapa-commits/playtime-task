
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
