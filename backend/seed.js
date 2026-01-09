const mongoose = require('mongoose');
const { User, Task, Assignment } = require('./models');

require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI;

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Conectando...');

    // 1. Limpiar BD
    await Assignment.deleteMany({});
    await User.deleteMany({});
    await Task.deleteMany({});

    // 2. Crear Usuarios con Schedules
    // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    // Helper para crear array de 7 días
    const fill = (val) => Array(7).fill(val);

    // Sara: Matutino Lunes a Domingo
    const scheduleSara = fill('matutino');

    // Sebastian: Vespertino Lunes a Domingo
    const scheduleSebastian = fill('vespertino');

    // Frida y Leo: Matutino (L-V), Vespertino (S-D)
    // Indexes: 1,2,3,4,5 = Matutino. 0,6 = Vespertino
    const scheduleMixed1 = ['vespertino', 'matutino', 'matutino', 'matutino', 'matutino', 'matutino', 'vespertino'];

    // Adjani: Vespertino Lunes a Domingo
    const scheduleAdjani = fill('vespertino');

    // Danae: Vespertino (L-V), Matutino (S-D)
    const scheduleMixed2 = ['matutino', 'vespertino', 'vespertino', 'vespertino', 'vespertino', 'vespertino', 'matutino'];

    const users = await User.insertMany([
      { name: 'Sara', weeklySchedule: scheduleSara },
      { name: 'Sebastian', weeklySchedule: scheduleSebastian },
      { name: 'Danae', weeklySchedule: scheduleMixed2 },
      { name: 'Adjani', weeklySchedule: scheduleAdjani },
      { name: 'Frida', weeklySchedule: scheduleMixed1 },
      { name: 'Leo', weeklySchedule: scheduleMixed1 },
    ]);

    // 3. Crear Tareas
    // ROLES (Diarios - type: 'role')
    // Se duplican para cubrir AM y PM
    const rolesConfig = [
      { title: 'Caja Principal', xp: 100 },
      { title: 'Canje de Premios', xp: 100 },
      { title: 'Area Infantil', xp: 120 }
    ];

    const roles = [];
    rolesConfig.forEach(r => {
      roles.push({ title: `${r.title} (Matutino)`, type: 'role', shift: 'matutino', xpReward: r.xp });
      roles.push({ title: `${r.title} (Vespertino)`, type: 'role', shift: 'vespertino', xpReward: r.xp });
    });

    // LIMPIEZA (Semanales - type: 'cleaning')
    // Las máquinas son 'general', cualquiera puede limpiarlas si se le asigna (o adaptaremos la lógica)
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
      shift: 'general',
      xpReward: 50,
      frequency: 'semanal'
    }));

    await Task.insertMany([...roles, ...cleaningTasks]);

    console.log(`✅ Base de datos REINICIADA:`);
    console.log(`- ${users.length} Empleados`);
    console.log(`- ${roles.length} Roles diarios (${roles.length / 2} por turno)`);
    console.log(`- ${cleaningTasks.length} Tareas de limpieza semanal`);

    process.exit(0);
  } catch (e) { console.error(e); }
};

seedDatabase();
