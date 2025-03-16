const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');

const JWT_SECRET = '';
const MONGODB_URI = '';

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
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Correo y contraseña son obligatorios'
        });
      }

      const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      const db = client.db('HCY_CONTACTOS');
      const usersCollection = db.collection('users');

      const user = await usersCollection.findOne({ email });

      if (!user) {
        await client.close();
        return res.status(401).json({
          success: false,
          message: 'Email incorrecto'
        });
      }

      // Hash de la contraseña ingresada
      const hash = crypto.createHash('sha256');
      hash.update(password);
      const hashedPassword = hash.digest('hex');

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
        nombre: user.nombre,
        apellido_p: user.apellido_p,
        apellido_m: user.apellido_m,
        email: user.email,
        telefon: user.telefon
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
