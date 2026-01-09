const mongoose = require('mongoose');
const { User, Task, Assignment } = require('./models');

const MONGO_URI = 'mongodb+srv://playcoapa:Coapa051@cluster0.gwa8ril.mongodb.net/?appName=Cluster0';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Conectando...');

    // 1. Limpiar BD
    await Assignment.deleteMany({});
    await User.deleteMany({});
    await Task.deleteMany({});

    // 2. Crear Usuarios con Días de Descanso y TURNOS
    const users = await User.insertMany([
      { name: 'Sara', restDays: [1], shift: 'matutino' },      // 🌅 Mañana
      { name: 'Sebastian', restDays: [1], shift: 'matutino' }, // 🌅 Mañana
      { name: 'Danae', restDays: [2], shift: 'matutino' },     // 🌅 Mañana

      { name: 'Adjani', restDays: [4], shift: 'vespertino' },  // 🌙 Tarde
      { name: 'Frida', restDays: [4], shift: 'vespertino' },   // 🌙 Tarde
      { name: 'Leo', restDays: [4], shift: 'vespertino' },     // 🌙 Tarde

      { name: 'Gerente', restDays: [0], shift: 'completo' }    // 🌟 Comodín (sale en ambos filtros si hacemos lógica para 'completo', o se adapta)
    ]);

    // 3. Crear Tareas
    // ROLES (Diarios - type: 'role')
    const roles = [
      { title: 'Caja Principal', type: 'role', xpReward: 100 },
      { title: 'Canje de Premios', type: 'role', xpReward: 100 },
      { title: 'Area Infantil', type: 'role', xpReward: 120 }
    ];

    // LIMPIEZA (Semanales - type: 'cleaning')
    // Usamos la lista de máquinas que ya tenías, pero ahora marcadas como 'cleaning'
    const machinesNames = [
      "Air FX B", "Angry Birds", "Area Inf 30 Min", "Bean Bag Toss B", "Big Bass B",
      "Billar (A)", "Boxer Combo", "Carrusel Peppa Pig", "Chocolate Factory",
      "Coconut Bash A", "Coconut Bash B", "Crazy Cans", "Cruisn Blast A", "Cruisn Blast B",
      "Deal or No Deal", "Dizzy Chicken", "Double Dribble A", "Down The Clown A",
      "Down The Clown B", "Ducky Splash A", "Ducky Splash B", "FF Super Bikes A",
      "FF Super Bikes B", "Fish Bowl Frenzy A", "Fish Bowl Frenzy B", "Fun Stop Photos",
      "Grand Piano Keys", "Hoopla A", "Hoopla B", "Ice Ball FX A", "Ice Ball FX B",
      "Ice Ball FX C", "Ice Ball FX D", "Jurassic Park", "Let's Bounce A", "Let's Bounce B",
      "Mario Kart DX A", "Mario Kart DX B", "Minion Wacker A", "Minion Wacker B",
      "Monopoly Roll N Go", "NBA Hoop Troop", "NBA Hoops A", "NBA Hoops B",
      "Panning for Gold", "Pirates Hook A", "Plush Bus A", "Plush Bus B",
      "Portrait Studio", "Quick Drop", "Seaway Submarine", "Smash N Win NBA Edition",
      "Space Invaders", "Spin O Rama", "Spinner Frenzy", "The Walking Dead",
      "Tons of Tickets A", "Tons of Tickets Mid", "Tons of Tickets B", "Transformers",
      "Treasure Quest A", "Treasure Quest C", "Water Blast A", "Whack N Win A",
      "Whack N Win B", "Whackem Funky", "Wheel of Fortune", "World Football",
      "Zombie Snatcher A"
    ];

    const cleaningTasks = machinesNames.map(m => ({
      title: `Limpiar: ${m}`,
      type: 'cleaning',
      xpReward: 50,
      frequency: 'semanal'
    }));

    await Task.insertMany([...roles, ...cleaningTasks]);

    console.log(`✅ Base de datos REINICIADA:`);
    console.log(`- ${users.length} Empleados (Con descansos asignados)`);
    console.log(`- ${roles.length} Roles diarios`);
    console.log(`- ${cleaningTasks.length} Tareas de limpieza semanal`);

    process.exit(0);
  } catch (e) { console.error(e); }
};

seedDatabase();
