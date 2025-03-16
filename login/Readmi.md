#### Comando para subir a cloud function

```bash

gcloud functions deploy contact-login --entry-point=login --runtime=nodejs22 --trigger-http --allow-unauthenticated --set-env-vars MONGODB_URI="mongodb+srv://cervaya003:Cervaya003@cluster0.vdtqwkl.mongodb.net/HCY_CONTACTOS?retryWrites=true&w=majority&appName=Cluster0"

```