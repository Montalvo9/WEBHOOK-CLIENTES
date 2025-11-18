import { Router } from "express";
import { WebhookController } from "../controllers/webhookController";
import { timeStamp } from "console";

const router = Router(); 
const controller = new WebhookController();


router.post("/", (req,res) => controller.handleWebhook(req,res));
router.get("/", (req, res) => controller.handleWebhook(req,res)); 

//Ruta de salud: Sirve para saber si el servidor esta vivo 
router.get('/health', (req, res) => {
    res.json({status: 'OK, Funcionando correctamente', timeStamp: new Date().toDateString()}); 
})

//Ruta de prueba Get 
router.get('/test', (req, res) => controller.handleWebhook(req,res));



export default router;