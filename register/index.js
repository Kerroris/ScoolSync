const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const moment = require('moment');
moment.locale('es');

const JWT_SECRET = 'zuputamadrememetiounsustodeembarazo2025';
const MONGODB_URI = 'mongodb+srv://kevinCisco:Asustoembarazo123@cluster0.6ngdm.mongodb.net/calendarioroger?retryWrites=true&w=majority&appName=Cluster0';

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
      const { username, email, password, fullName, birthDate } = req.body;

      if (!username || !email || !password || !fullName || !birthDate) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }

      // Conexión a MongoDB Atlas
      const client = new MongoClient(MONGODB_URI);
      await client.connect();

      const db = client.db('calendarioroger');
      const usersCollection = db.collection('users');

      // Verificar si el email ya está registrado
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        await client.close();
        return res.status(409).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }

      // Hash de la contraseña
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      const fechaUTC = moment().utcOffset('-06:00').toDate();

      // Crear nuevo usuario
      const newUser = {
        username,
        email,
        password: hashedPassword,
        fullName,
        birthDate,
        fecha_registro: fechaUTC,
        fecha_actualizacion: fechaUTC
      };

      // Insertar en la base de datos
      const result = await usersCollection.insertOne(newUser);
      const userId = result.insertedId;

      const userResponse = {
        _id: userId, // ✅ Agregado correctamente
        username,
        email,
        fullName,
        birthDate
      };

      // Generar token JWT
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
