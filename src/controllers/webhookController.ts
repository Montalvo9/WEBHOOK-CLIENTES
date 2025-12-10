import { Request, Response } from "express";
import { KommoService } from '../services/kommoService';
import { DatabaseService } from '../services/databaseService';
import colors from 'colors';
import { debugLog, extraerDatosContacto } from '../utils/helpers'
import { WebhookPayload, ContactData,  AccountData } from '../types/types';
import axios from "axios";




/*export class WebhookController {
    handleWebhook(req: Request, res: Response) {
        console.log("Datos recibidos:", req.body);
        res.json({ message: "Webhook recibido" });
    }
}*/

export class WebhookController {
    private kommoService: KommoService;
    private databaseService: DatabaseService;

    //Constructor 
    constructor() {
        this.kommoService = new KommoService;
        this.databaseService = new DatabaseService;
    }

    //Función principal que recibe todo (Detecta lo que esta mandando Kommo) 
    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            debugLog(colors.cyan("Script Iniciado"));

            //Prueba directa con parametros GET (Solo pruebas)
            if (req.query.nombre) {
                await this.handleTestRequest(req, res);
                return;
            }

            //Para procesar datos de formulario URL-encoded que es como los manda Kommo al webhook. 
            if (req.is('application/x-www-form-urlencoded')) {
                await this.handleUrlEncodeRequest(req, res);
                return;
            }

            //Si recibe Json procesa con la funcion handleJsonRequest
            if (req.is('application/json')) {
                await this.handleJsonRequest(req, res);
                return;

            }

            //Si no coincide con algun tipo procesarlo como viene
            await this.processRequest(req, res);
            return;
        } catch (error) {
            debugLog(colors.red("Error en handleWehook:"), error);
            res.status(500).send(colors.bgRed("Error interno del servidor"));
        }
    }

    /* Función handleUrlEncodeRequest que es el que procesa ese tipo de contenido */

    private async handleUrlEncodeRequest(req: Request, res: Response): Promise<void> {
        //rawbody: (cuerpo sin procesar) 
        const rawBody = JSON.stringify(req.body);
        debugLog('RAW INPUT:', rawBody);  //Observar en log que datos vienen 
        debugLog('POST', req.body);

        let datosExtraidos: ContactData = { nombre: '' };
        let tieneDatosChat = false;

        //Extraer datos del mensaje en formato URL-encoded
        const messageText = this.extractMessageFromUrlEncoded(req.body);
        if (messageText) {
            debugLog('Mensaje extraido:', messageText);
            datosExtraidos = extraerDatosContacto(messageText);  //Extarer datos contacto estara en herlpers (ahi estara esa funcion)
            if (datosExtraidos.nombre) {
                tieneDatosChat = true;
            }
        }

        //Obtener Lead ID desde URL-encode
        const leadId = this.extractLeadIdFromUrlEncoded(req.body);
        const accountData = this.extractAccountDataFromUrlEncoded(req.body);

        await this.proccessLeadData(leadId, accountData, datosExtraidos, tieneDatosChat, res);
    }

    /** Funncion handleJsonRequest (Quien procesa los datos si es que llegan en JSON) */

    private async handleJsonRequest(req: Request, res: Response): Promise<void> {
        const payload: WebhookPayload = req.body;
        const rawBody = JSON.stringify(req.body);
        debugLog("RAW INPUT:", rawBody);
        debugLog("POST:", payload);

        let datosExtraidos: ContactData = { nombre: '' };
        let tieneDatosChat = false;

        //Extraer datos del mensaje del JSON
        const textoMensaje = payload.message?.add?.[0]?.text;
        if (textoMensaje) {
            debugLog('Mensaje del POST:', textoMensaje);
            datosExtraidos = extraerDatosContacto(textoMensaje);  //La funcion extraerDatosContacto esta en utils/helpers.ts
            if (datosExtraidos.nombre) {
                tieneDatosChat = true;
            }
        }

        //Obtener Lead ID desde JSON 
        const leadId = payload.leads?.add?.[0]?.id;
        const acccountData = payload.account || {};
        await this.proccessLeadData(leadId, acccountData, datosExtraidos, tieneDatosChat, res);

    }

    //Funcion que procesa los datos asi como vienen (en dado caso que no vemga ni en json o urlencode)
    private async processRequest(body: any, res: Response): Promise<void> {
        debugLog('Procesando request en formato desconocido:', body);

        let datosExtraidos: ContactData = { nombre: '' }
        let leadId: number | undefined;
        let accountData = {};

        //Intentar extraer datos en diferentes formatos 
        if (body.leads?.add?.[0]?.id) {
            // Formato JSON estándar
            leadId = body.leads.add[0].id;
            accountData = body.account || {};

            if (body.message?.add?.[0]?.text) {
                datosExtraidos = extraerDatosContacto(body.message.add[0].text);
            }
        } else {
            // Intentar formato URL-encoded
            leadId = this.extractLeadIdFromUrlEncoded(body);
            accountData = this.extractAccountDataFromUrlEncoded(body);

            const messageText = this.extractMessageFromUrlEncoded(body);
            if (messageText) {
                datosExtraidos = extraerDatosContacto(messageText);
            }
        }

        await this.proccessLeadData(leadId, accountData, datosExtraidos, false, res);
    }

    private async proccessLeadData(
        leadId: number | undefined,
        accountData: any,
        datosExtraidos: ContactData,
        tieneDatosChat: boolean,
        res: Response
    ): Promise<void> {
        if (!leadId) {
            debugLog("No se encontro Lead Id");
            res.send('false');
            return;
        }
        debugLog('Lead ID:', leadId);

        //Obtener datos completos.
        let datosFinales = datosExtraidos;
        //“Si NO tiene datos de chat, entonces obtén los datos completos desde Kommo.”
        if (!tieneDatosChat) {
            debugLog('Obteniendo datos del Lead /Contacto desde Kommo:');
            datosFinales = await this.kommoService.obtenerDatosCompletos(leadId, accountData);
        }

        //Verificar en la base de datos
        const existe = await this.databaseService.verificarEnBaseDatos(datosFinales);

        //Actualizar campo personalizado de Kommo
        debugLog("--- ACTUALIZANDO CAMPO ---");
        const campoId = parseInt(process.env.CAMPO_CLIENTE_ID || '1489098');
        const campoActualizado = await this.kommoService.actualizarCampoKommo(leadId, accountData, existe, campoId);

        //Log Final
        debugLog("---- RESULTADO FINAL -----");
        debugLog(`Cliente: ${existe ? 'EXISTE' : 'NUEVO'}`);
        debugLog(`Campo actualizado: ${campoActualizado ? 'SÍ' : 'NO'}`);
        debugLog('Datos usados:', datosFinales);

        //Respuesta para kommo
        res.send(existe ? 'true' : 'false');

    }

    private extractMessageFromUrlEncoded(body: any): string {
        // Buscar mensaje en diferentes formatos URL-encoded
        if (body.message?.add?.[0]?.text) {
            return body.message.add[0].text;
        }

        // Buscar en formato de string crudo
        const rawString = JSON.stringify(body);
        const messageMatch = rawString.match(/message%5Badd%5D%5B0%5D%5Btext%5D=([^&]+)/);
        if (messageMatch) {
            return decodeURIComponent(messageMatch[1]);
        }

        const unsortedMatch = rawString.match(/unsorted%5B\w+%5D%5B0%5D%5Bsource_data%5D%5Bdata%5D%5B0%5D%5Btext%5D=([^&]+)/);
        if (unsortedMatch) {
            return decodeURIComponent(unsortedMatch[1]);
        }

        return '';
    }

    private extractLeadIdFromUrlEncoded(body: any): number | undefined {
        if (body.leads?.add?.[0]?.id) {
            return parseInt(body.leads.add[0].id);
        }

        // Buscar en formato de string crudo
        const rawString = JSON.stringify(body);
        const leadMatch = rawString.match(/leads%5Badd%5D%5B0%5D%5Bid%5D=(\d+)/);
        if (leadMatch) {
            return parseInt(leadMatch[1]);
        }

        return undefined;
    }

    private extractAccountDataFromUrlEncoded(body: any): any {
        if (body.account) {
            return body.account;
        }

        return { subdomain: 'bitalaal7' }; // Valor por defecto
    }

    private async handleTestRequest(req: Request, res: Response): Promise<void> {
        const token = req.query.token as string;
        const testToken = process.env.TEST_TOKEN;

        if (!token || token !== testToken) {
            res.status(403).send('Acceso denegado. Token inválido.');
            return;
        }

        const datosPrueba: ContactData = {
            nombre: (req.query.nombre as string)
        };

        debugLog('=== PRUEBA DIRECTA GET ===');
        debugLog('Datos:', datosPrueba);
        console.log("DB SERVICE:", this.databaseService);
        const existe = await this.databaseService.verificarEnBaseDatos(datosPrueba);

        res.send(`
      <h2>Resultado:</h2>
      <p><strong>${existe ? 'Cliente EXISTE' : 'Cliente NUEVO'}</strong></p>
      <h3>Datos buscados:</h3>
      <ul>
        <li><strong>Nombre:</strong> ${this.escapeHtml(datosPrueba.nombre)}</li>
        
      </ul>
    `);
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

   


}



