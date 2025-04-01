#### Comando para subir a cloud function

```bash

gcloud functions deploy login-cal --entry-point=login --runtime=nodejs22 --trigger-http --allow-unauthenticated --set-env-vars MONGODB_URI="mongodb+srv://kevinCisco:Asustoembarazo123@cluster0.6ngdm.mongodb.net/calendarioroger?retryWrites=true&w=majority&appName=Cluster0"

```

https://us-central1-mvc-kcm-448600.cloudfunctions.net/login-cal