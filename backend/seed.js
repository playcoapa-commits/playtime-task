const mongoose = require('mongoose');
const { User, Task, Assignment } = require('./models');

const MONGO_URI = 'mongodb+srv://playcoapa:Coapa051@cluster0.gwa8ril.mongodb.net/?appName=Cluster0';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Conectando...');

    // Limpiar BD
    await Assignment.deleteMany({});
    await User.deleteMany({});
    await Task.deleteMany({});

    // 1. Tus Empleados
    const users = await User.insertMany([
      { name: 'Sara', role: 'general' },
      { name: 'Leo', role: 'general' },
      { name: 'Adjani', role: 'general' },
      { name: 'Sebastian', role: 'general' },
      { name: 'Frida', role: 'general' },
      { name: 'Dana', role: 'general' }
    ]);

    // 2. Tus Máquinas
    const machines = [
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

    const tasks = machines.map(m => ({
      title: `Limpiar: ${m}`,
      description: `Limpieza y desinfección de ${m}`,
      requiredRole: null
    }));

    await Task.insertMany(tasks);
    console.log(`✅ Base de datos lista: 6 empleados y ${machines.length} máquinas.`);
    process.exit(0);
  } catch (e) { console.error(e); }
};

seedDatabase();
