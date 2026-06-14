require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => res.json({ message: 'SMK Pasundan 2 Bandung — API Kurikulum' }));

sequelize.authenticate()
  .then(() => {
    console.log('Database terhubung');
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Gagal terhubung ke database:', err.message);
    process.exit(1);
  });
