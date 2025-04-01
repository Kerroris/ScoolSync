#### Comando para subir a cloud function

```bash

gcloud functions deploy register-cal --entry-point=register --runtime=nodejs22 --trigger-http --allow-unauthenticated --set-env-vars MONGODB_URI="mongodb+srv://kevinCisco:Asustoembarazo123@cluster0.6ngdm.mongodb.net/calendarioroger?retryWrites=true&w=majority&appName=Cluster0"

gcloud functions deploy contact-register --gen2 --entry-point register --runtime nodejs20 --trigger-http --allow-unauthenticated --source=register
```



https://us-central1-mvc-kcm-448600.cloudfunctions.net/register-cal



