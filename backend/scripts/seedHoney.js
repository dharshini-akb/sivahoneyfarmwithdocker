const mongoose = require('mongoose');
const Product = require('../models/Product');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const products = [
  // --- HONEY CATEGORY ---
  {
    name: 'Organic Multiflora Honey',
    description: '100% Natural & Unprocessed. Collected from multiple flowers in the forest.',
    price: 299,
    category: 'honey',
    stock: 50,
    featured: true,
    image: 'products/1769342153860-multiflorahoney.png',
  },
  {
    name: 'Organic Kothamali Honey',
    description: 'Pure coriander flower honey with a unique herbal taste.',
    price: 319,
    category: 'honey',
    stock: 50,
    featured: true,
    image: 'products/1769341946211-kothumalihoney.png',
  },
  {
    name: 'Organic Murungai Honey',
    description: 'Rich in iron and minerals, collected from Moringa flowers.',
    price: 329,
    category: 'honey',
    stock: 50,
    featured: true,
    image: 'products/1769341787505-murungaihoney.png',
  },
  {
    name: 'Organic Naval Honey',
    description: 'Specialty honey from Jamun flowers, known for its medicinal properties.',
    price: 349,
    category: 'honey',
    stock: 50,
    featured: true,
    image: 'products/1769341576773-navalhoney.png',
  },
  {
    name: 'Pure Organic Honey',
    description: 'Pure organic honey for your daily health needs.',
    price: 300,
    category: 'honey',
    stock: 100,
    featured: false,
    image: 'products/1769342892940-Organic Honey.png',
  },

  // --- MASALA CATEGORY ---
  {
    name: 'Organic Turmeric Powder',
    description: 'Highly aromatic and pure turmeric powder.',
    price: 149,
    category: 'masala',
    stock: 150,
    featured: true,
    image: 'products/1769359540355-TumericPowder.png',
  },
  {
    name: 'Curry Masala Powder',
    description: 'Authentic curry masala for delicious dishes.',
    price: 189,
    category: 'masala',
    stock: 120,
    featured: true,
    image: 'products/1769359671645-currymasalapowder.png',
  },
  {
    name: 'Coriander Powder',
    description: 'Freshly ground coriander powder.',
    price: 129,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360027105-corianderpowder.png',
  },
  {
    name: 'Kollu Podi',
    description: 'Traditional horse gram podi.',
    price: 150,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360132797-kollu podi.png',
  },
  {
    name: 'Karuveppilai Podi',
    description: 'Curry leaves powder for health and taste.',
    price: 150,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360382304-karuveppilai podi.png',
  },
  {
    name: 'Murungai Podi',
    description: 'Moringa leaves powder.',
    price: 160,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360459118-Murungai podi.png',
  },
  {
    name: 'Paruppu Podi',
    description: 'Lentil powder for rice.',
    price: 140,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360546095-paruppu podi.png',
  },
  {
    name: 'Garam Masala',
    description: 'Pure and aromatic garam masala.',
    price: 170,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360710548-garam masala.png',
  },
  {
    name: 'Red Chilli Powder',
    description: 'Spicy and red chilli powder.',
    price: 130,
    category: 'masala',
    stock: 100,
    featured: false,
    image: 'products/1769360824940-red chilli powder.png',
  },
  {
    name: 'Idli Podi',
    description: 'Traditional south Indian idli podi.',
    price: 150,
    category: 'masala',
    stock: 100,
    featured: true,
    image: 'products/1769361133012-Idli Podi.png',
  },

  // --- MALT CATEGORY ---
  {
    name: 'Multigrain Malt',
    description: 'Nutritious multigrain health drink.',
    price: 399,
    category: 'malt',
    stock: 45,
    featured: true,
    image: 'products/1769409341656-Multigrain MALT.png',
  },
  {
    name: 'Beetroot Malt',
    description: 'Healthy beetroot malt drink.',
    price: 450,
    category: 'malt',
    stock: 50,
    featured: true,
    image: 'products/1769409643597-BEETROOT MALT.png',
  },
  {
    name: 'Carrot Malt',
    description: 'Nutritious carrot malt.',
    price: 450,
    category: 'malt',
    stock: 50,
    featured: false,
    image: 'products/1769409716789-Carrot MALT.png',
  },
  {
    name: 'Sathumavu Malt',
    description: 'Traditional health mix powder.',
    price: 400,
    category: 'malt',
    stock: 100,
    featured: true,
    image: 'products/1769409903486-SATHUMAVU MALT.png',
  },
  {
    name: 'Ragi Malt',
    description: 'Healthy finger millet malt.',
    price: 350,
    category: 'malt',
    stock: 100,
    featured: false,
    image: 'products/1769409993267-Ragi MALT.png',
  },
  {
    name: 'ABC Malt',
    description: 'Apple, Beetroot, Carrot malt mix.',
    price: 499,
    category: 'malt',
    stock: 50,
    featured: true,
    image: 'products/1769410072895-ABC MALT.png',
  },

  // --- OIL CATEGORY ---
  {
    name: 'Castor Oil',
    description: 'Pure cold pressed castor oil.',
    price: 250,
    category: 'oil',
    stock: 50,
    featured: false,
    image: 'products/1769419346142-Castoroil.png',
  },
  {
    name: 'Groundnut Oil',
    description: 'Traditional wood pressed groundnut oil.',
    price: 299,
    category: 'oil',
    stock: 75,
    featured: true,
    image: 'products/1769419460500-Groundnutoil.png',
  },
  {
    name: 'Sesame Oil',
    description: 'Pure sesame oil.',
    price: 349,
    category: 'oil',
    stock: 60,
    featured: false,
    image: 'products/1769419569968-Sesameoil.png',
  },
  {
    name: 'Olive Oil',
    description: 'Premium olive oil.',
    price: 599,
    category: 'oil',
    stock: 40,
    featured: false,
    image: 'products/1769419655238-Olive Oil.png',
  },
  {
    name: 'Coconut Oil',
    description: '100% Pure coconut oil.',
    price: 299,
    category: 'oil',
    stock: 100,
    featured: true,
    image: 'products/1769419747757-Coconut Oil.png',
  },
  {
    name: 'Herbal Oil',
    description: 'Nutritious herbal hair oil.',
    price: 350,
    category: 'oil',
    stock: 50,
    featured: true,
    image: 'products/1770213331664-Herbal Oil.png',
  },

  // --- SOAP CATEGORY ---
  {
    name: 'Beetroot Soap',
    description: 'Natural beetroot soap for glowing skin.',
    price: 89,
    category: 'soap',
    stock: 100,
    featured: true,
    image: 'products/1769422388544-Beetroot Soap.png',
  },
  {
    name: 'Papaya Soap',
    description: 'Natural papaya soap.',
    price: 89,
    category: 'soap',
    stock: 100,
    featured: false,
    image: 'products/1769422496926-Papaya Soap.png',
  },
  {
    name: 'Herbal Soap',
    description: 'Traditional herbal soap.',
    price: 79,
    category: 'soap',
    stock: 100,
    featured: true,
    image: 'products/1769422581518-Herbal Soap.png',
  },
  {
    name: 'Carrot Soap',
    description: 'Natural carrot soap.',
    price: 89,
    category: 'soap',
    stock: 100,
    featured: false,
    image: 'products/1769422681029-Carrot Soap.png',
  },
  {
    name: 'Rose Soap',
    description: 'Fragrant rose soap.',
    price: 99,
    category: 'soap',
    stock: 100,
    featured: false,
    image: 'products/1769422829726-Rose Soap.png',
  },
  {
    name: 'Washing Soap',
    description: 'Organic washing soap.',
    price: 49,
    category: 'soap',
    stock: 200,
    featured: false,
    image: 'products/1769429015160-Washing Soap.png',
  },

  // --- WASHING POWDER CATEGORY ---
  {
    name: 'Soap Oil',
    description: 'Effective soap oil for cleaning.',
    price: 120,
    category: 'washingpowder',
    stock: 100,
    featured: false,
    image: 'products/1769428732354-Soap oil.png',
  },
  {
    name: 'Herbal Washing Powder',
    description: 'Plant-based detergent.',
    price: 159,
    category: 'washingpowder',
    stock: 90,
    featured: true,
    image: 'products/1769428801027-Herbal Washing Powder.png',
  },
  {
    name: 'Washing Powder',
    description: 'Regular washing powder.',
    price: 99,
    category: 'washingpowder',
    stock: 100,
    featured: false,
    image: 'products/1769428861896-Washing Powder.png',
  },
  {
    name: 'Detergent Powder',
    description: 'Strong detergent powder.',
    price: 110,
    category: 'washingpowder',
    stock: 100,
    featured: false,
    image: 'products/1769428914200-Detergent Powder.png',
  },

  // --- SHAMPOO CATEGORY ---
  {
    name: 'Herbal Shampoo',
    description: 'Natural herbal shampoo.',
    price: 249,
    category: 'shampoo',
    stock: 80,
    featured: true,
    image: 'products/1769430118699-Herbal Shampoo.png',
  },
  {
    name: 'Arrapu Powder',
    description: 'Traditional arrapu powder for hair.',
    price: 120,
    category: 'shampoo',
    stock: 100,
    featured: false,
    image: 'products/1769429834902-Arrapu Powder.png',
  },
  {
    name: 'Sevakkai Powder',
    description: 'Traditional shikakai powder.',
    price: 150,
    category: 'shampoo',
    stock: 100,
    featured: true,
    image: 'products/1770211487759-sevakkai POwder.png',
  },
];

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing products to ensure clean seed
    console.log('Clearing existing products...');
    await Product.deleteMany({});
    console.log('Products cleared.');

    console.log('Seeding products with correct names, categories and images from backend...');
    for (const item of products) {
      const doc = new Product(item);
      await doc.save();
      console.log(`Successfully added: ${item.name} in Category: [${item.category}]`);
    }

    console.log('----------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Total products added:', products.length);
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

run();
