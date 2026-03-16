const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'polleria',
    });
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ Error conectando MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
