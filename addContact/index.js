const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { ObjectId } = require("mongodb");

const JWT_SECRET = "";
const MONGODB_URI = "";

// Configuración CORS
const corsMiddleware = cors({
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
});

exports.addContact = async (req, res) => {
  if (req.method === "OPTIONS") {
    return corsMiddleware(req, res, () => res.status(200).end());
  }

  corsMiddleware(req, res, async () => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ success: false, message: "Token no proporcionado" });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(403).json({ success: false, message: "Token expirado" });
        }
        if (error instanceof jwt.JsonWebTokenError) {
          return res.status(403).json({ success: false, message: "Token inválido" });
        }
        return res.status(403).json({ success: false, message: "Error al verificar el token" });
      }

      const userId = decoded._id;
      const { nombre, telefono, contri, latitude, longitude, email, img, apellido, direccion, nota } = req.body;

      if (!nombre || !telefono || !contri || !latitude || !longitude) {
        return res.status(400).json({ success: false, message: "Los campos 'nombre', 'telefono', 'contri', 'latitude' y 'longitude' son obligatorios" });
      }

      const client = await MongoClient.connect(MONGODB_URI);
      const db = client.db("HCY_CONTACTOS");
      const contactsCollection = db.collection("contactos");

      const newContact = {
        nombre,
        telefono,
        contri,
        latitude,
        longitude,
        userId: new ObjectId(userId),
        createdAt: new Date(),
        email: email || null,
        imagen: null,  
        apellido: apellido || null,
        direccion: direccion || null,
        nota: nota || null,
      };

      const result = await contactsCollection.insertOne(newContact);
      await client.close();

      return res.status(201).json({
        success: true,
        message: "Contacto agregado con éxito",
        contactId: result.insertedId,
      });

    } catch (error) {
      console.error("Error al agregar contacto:", error);
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  });
};

