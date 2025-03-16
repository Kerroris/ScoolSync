const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const moment = require('moment');
moment.locale('es');

const JWT_SECRET = '';
const MONGODB_URI = '';

// Configuración CORS
const corsMiddleware = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
});

exports.register = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return corsMiddleware(req, res, () => res.status(200).end());
  }

  corsMiddleware(req, res, async () => {
    try {
      const { nombre, apellido_p, apellido_m, email, telefon, pass, confirm_pass } = req.body;

      if (!nombre || !apellido_p || !apellido_m || !email || !telefon || !pass || !confirm_pass) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }

      // Verificar que las contraseñas coincidan
      if (pass !== confirm_pass) {
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden'
        });
      }

      // Conexión a MongoDB Atlas
      const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      const db = client.db('HCY_CONTACTOS');
      const usersCollection = db.collection('users');

      const existingEmail = await usersCollection.findOne({ email });
      const existingPhone = await usersCollection.findOne({ telefon });

      if (existingEmail) {
        await client.close();
        return res.status(409).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }

      if (existingPhone) {
        await client.close();
        return res.status(409).json({
          success: false,
          message: 'El número de teléfono ya está registrado'
        });
      }

      const hash = crypto.createHash('sha256');
      hash.update(pass);
      const hashedPassword = hash.digest('hex');
      const fechaUTC = moment().utcOffset('-06:00').toDate();

      const newUser = {
        nombre,
        apellido_p,
        apellido_m,
        email,
        telefon,
        password: hashedPassword, 
        fecha_registro: fechaUTC,
        fecha_actualizacion: fechaUTC
      };

      // Insertar nuevo usuario en la base de datos
      const result = await usersCollection.insertOne(newUser);
      const userId = result.insertedId;

      const userResponse = {
        _id: userId,
        nombre,
        apellido_p,
        apellido_m,
        email,
        telefon
      };

      const token = jwt.sign(userResponse, JWT_SECRET, { expiresIn: '365d' });

      await client.close();
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        token,
        user: userResponse
      });

    } catch (err) {
      console.error('Error en registro:', err);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });
};
