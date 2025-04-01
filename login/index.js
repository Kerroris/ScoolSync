const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');

const JWT_SECRET = 'zuputamadrememetiounsustodeembarazo2025';
const MONGODB_URI = 'mongodb+srv://kevinCisco:Asustoembarazo123@cluster0.6ngdm.mongodb.net/calendarioroger?retryWrites=true&w=majority&appName=Cluster0';

// Configuración CORS
const corsMiddleware = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
});

exports.login = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return corsMiddleware(req, res, () => res.status(200).end());
  }

  corsMiddleware(req, res, async () => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username y contraseña son obligatorios'
        });
      }

      const client = new MongoClient(MONGODB_URI);
      await client.connect();

      const db = client.db('calendarioroger');
      const usersCollection = db.collection('users');

      // Buscar usuario por username
      const user = await usersCollection.findOne({ username });

      if (!user) {
        await client.close();
        return res.status(401).json({
          success: false,
          message: 'Username incorrecto'
        });
      }

      // Hash de la contraseña ingresada
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

      // Verificar contraseña
      if (hashedPassword !== user.password) {
        await client.close();
        return res.status(401).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      // Crear objeto usuario sin contraseña
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        birthDate: user.birthDate
      };
      
      const token = jwt.sign(userResponse, JWT_SECRET, { expiresIn: '365d' });


      // Cerrar conexión y responder
      await client.close();
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        user: userResponse
      });

    } catch (err) {
      console.error('Error en login:', err);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });
};
