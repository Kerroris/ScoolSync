from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient
from bson import ObjectId
import os
import base64
import jwt
from flask_cors import CORS
from dotenv import load_dotenv
from google.cloud import storage
from datetime import timedelta
from datetime import datetime

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# 🔑 Clave secreta para JWT
JWT_SECRET = ''

# 🔗 Conectar a MongoDB
MONGO_URI =''
client = MongoClient(MONGO_URI)
db = client["HCY_CONTACTOS"]
contactos_collection = db["contactos"]

# 📂 Configuración del bucket de Google Cloud Storage
BUCKET_NAME = "bucket_contactos"

# Configurar credenciales de Google Cloud Storage
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./contactos-key.json"

def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def upload_image_to_bucket(image_bytes, file_name):
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(file_name)
        blob.upload_from_string(image_bytes, content_type='image/jpeg')

        # Hacer la imagen pública
        blob.make_public()

        #  URL pública permanente
        return blob.public_url
    except Exception as e:
        raise Exception(f"Error al subir la imagen al bucket: {e}")


@app.route('/api/insercontacto', methods=['POST'])
def insert_contacto():
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return jsonify({"message": "Token no proporcionado"}), 401

    token = token.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({"message": "Token inválido"}), 403

    user_id = payload.get("_id")
    if not user_id:
        return jsonify({"message": "El token no contiene un ID válido"}), 403

    data = request.json
    required_fields = ["nombre", "telefono", "latitude", "longitude", "contri"]
    for field in required_fields:
        if field not in data:
            return jsonify({"message": f"Falta el campo obligatorio: {field}"}), 400

    image_url = None
    if "img" in data and data["img"]:
        try:
            img_data = data["img"].split(",")[1]
            img_bytes = base64.b64decode(img_data)
            file_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"

            # Subir imagen al bucket
            image_url = upload_image_to_bucket(img_bytes, file_name)
        except Exception as e:
            return jsonify({"message": "Error al procesar la imagen", "error": str(e)}), 500

    contacto = {
        "nombre": data["nombre"],
        "telefono": data["telefono"],
        "latitude": data["latitude"],
        "longitude": data["longitude"],
        "userId": ObjectId(user_id),
        "contri": data["contri"],
        "apellido": data.get("apellido", None),
        "email": data.get("email", None),
        "direccion": data.get("direccion", None),
        "nota": data.get("nota", None),
        "img": image_url  
    }

    result = contactos_collection.insert_one(contacto)
    return jsonify({"message": "Contacto guardado exitosamente", "id": str(result.inserted_id)}), 201

@app.route('/', methods=['GET'])
def hola():
    return jsonify({"message": "API - CONTACTOS - CERVAYA "}), 200

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')


def delete_image_from_bucket(image_url):
    """Elimina una imagen del bucket de Google Cloud Storage."""
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)

        # Extraer el nombre del archivo desde la URL
        file_name = image_url.split("/")[-1]

        # Eliminar el archivo del bucket
        blob = bucket.blob(file_name)
        blob.delete()

        print(f"Imagen {file_name} eliminada exitosamente")
    except Exception as e:
        print(f"Error al eliminar la imagen {file_name}: {e}")

@app.route('/api/deletecontacto', methods=['POST'])
def delete_contacto():
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return jsonify({"message": "Token no proporcionado"}), 401

    token = token.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({"message": "Token inválido"}), 403

    user_id = payload.get("_id")
    if not user_id:
        return jsonify({"message": "El token no contiene un ID válido"}), 403

    data = request.json
    if not isinstance(data, list):
        return jsonify({"message": "Se esperaba una lista de IDs"}), 400

    object_ids = []
    for contact_id in data:
        try:
            obj_id = ObjectId(contact_id)
            contacto = contactos_collection.find_one({"_id": obj_id})
            if not contacto:
                return jsonify({"message": f"Contacto con ID {contact_id} no encontrado"}), 404
            if str(contacto["userId"]) != user_id:
                return jsonify({"message": f"No tienes permisos para eliminar el contacto {contact_id}"}), 403
            
            # Si el contacto tiene una imagen, eliminarla del bucket
            if "img" in contacto and contacto["img"]:
                delete_image_from_bucket(contacto["img"])

            object_ids.append(obj_id)
        except:
            return jsonify({"message": f"ID inválido: {contact_id}"}), 400

    delete_result = contactos_collection.delete_many({"_id": {"$in": object_ids}})
    return jsonify({"message": f"Se eliminaron {delete_result.deleted_count} contactos exitosamente"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)