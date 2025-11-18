/* Servidor de Exprees (Archivo principal) */ 
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import colors from 'colors';
import { WebhookController } from './controllers/webhookController';
import webhookRoutes from "./routes/webhookRoutes";
import cors from 'cors';

/* ----- CODIGO PARA PROBAR QUE FUNCIONE EL SERVIDOR-------
const app = express();
const port = 5000; 

app.use(express.json());
app.post('/kommowebhook', (req, res) =>{
    console.log('Webhook recibido'); 
    res.status(200).send("OK"); 
})

app.listen(port, () =>{
       console.log(colors.green(`Servidor iniciado en http://localhost:${port}`));
})  --------Cuando   se verifica que funcione, se crean el controlador y las rutas y el codigo de este index.ts cambia a lo siguiente*/


//Configurar variables de entorno 


const app = express();
const port = process.env.PORT || 5000; 

// Middleware 
app.use(express.json());
app.use(express.urlencoded({extended:true}));  // Esto porque kommo manda los datos en un formato url-encode, no los manda como json directamente
app.use(cors());

app.use("/webhook", webhookRoutes);



// app.listen(5000,()=> console.log(colors.blue("Servidor listo"))); 

//Iniciar el servidor
app.listen(port, () => {
    console.log(colors.blue(`Servidor ejecutandose en el puerto: ${port}`));
})
