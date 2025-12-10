// webhookGlobalController.ts

import { Request, Response } from "express";
import { KommoService } from "../services/kommoService";


export class WebhookGlobalController {
    private KommoService: KommoService;

    constructor() {
        this.KommoService = new KommoService();
    }

    async handleWebhookGlobal(req: Request, res: Response) {
        const body = req.body;

        console.log("===== WEBHOOK RECIBIDO =====");
        console.log(JSON.stringify(body, null, 2));

        const subdomain = process.env.KOMMO_SUBDOMAIN!;

        /*
        ======================================================
        ======================= message.add ==================
        En message.add vienen las imagenes y por ahi manda 
        ======================================================
        */
        const messageAdd = body?.message?.add?.[0];
        if (messageAdd) {
            console.log("EVENTO message.add DETECTADO");

            const texto = messageAdd.text || null;
            const imagen = messageAdd.attachment?.link || null;   
            const leadId = Number(messageAdd.element_id) || null;
            const contactoId = Number(messageAdd.contact_id) || null;

            console.log("Texto recibido:", texto);
            console.log("Imagen recibida:", imagen);
            console.log("Lead detectado:", leadId);

            await this.procesarMensajeGeneral({
                contactoId,
                leadId,
                texto,
                imagen
            });

            return res.send("OK");
        }


        /*
        ======================================================
        =================== unsorted.update ==================
        ======================================================
        */
        if (body?.unsorted?.update) {
            console.log("EVENTO unsorted.update DETECTADO");

            const unsorted = body.unsorted.update[0];

            // Extraer texto
            const texto = unsorted?.source_data?.data?.[0]?.text || null;
            
            // Extraer imagen (puede estar en diferentes lugares)
            const imagen = unsorted?.source_data?.data?.[0]?.media || 
                          unsorted?.source_data?.data?.[0]?.attachment?.link || 
                          null;

            // CORREGIDO: leadId está en data.leads.id
            const leadId = unsorted?.data?.leads?.id ||
                          body?.leads?.update?.[0]?.id ||
                          null;

            // Obtener contactoId del cliente
            const contactoId = unsorted?.source_data?.client?.id ||
                              unsorted?.source_data?.data?.[0]?.contact_id ||
                              null;

            console.log("Texto recibido (unsorted):", texto);
            console.log("Imagen recibida (unsorted):", imagen);
            console.log("Lead detectado:", leadId);
            console.log("Contacto detectado:", contactoId);

            // PROCESAR el mensaje si hay leadId
            if (leadId) {
                await this.procesarMensajeGeneral({
                    contactoId: contactoId ? Number(contactoId.replace(/\D/g, '')) : null,
                    leadId: Number(leadId),
                    texto,
                    imagen
                });
            } else {
                console.log(" No se puede procesar: falta leadId");
            }

            return res.send("OK");
        }

        return res.send("Evento no manejado");
    }

    /*
    ======================================================
    ================== PROCESAR MENSAJE ==================
    ======================================================
    */
    private async procesarMensajeGeneral({
        contactoId,
        leadId,
        texto,
        imagen
    }: {
        contactoId: number | null,
        leadId: number | null,
        texto: string | null,
        imagen: string | null
    }) {

        const subdomain = process.env.KOMMO_SUBDOMAIN!;
        console.log(" Procesando mensaje universal");
        console.log(`   - leadId: ${leadId}`);
        console.log(`   - texto: ${texto}`);
        console.log(`   - imagen: ${imagen}`);

        if (!leadId) {
            console.log(" leadId es null — deteniendo proceso.");
            return;
        }

        // Obtener lead
        console.log(` Obteniendo lead ${leadId}...`);
        const lead = await this.KommoService.obtenerLead(leadId, subdomain);

        if (!lead) {
            console.log(" No pude obtener lead — deteniendo proceso.");
            return;
        }

        // Obtener campo estado_bot
        const campo_esperando_pedido = process.env.CAMPO_ESTADO_BOT;
        if (!campo_esperando_pedido) {
            console.log(" CAMPO_ESTADO_BOT no está definido en .env — deteniendo proceso.");
            return;
        }

        const estadoBot = await this.KommoService.obtenerCampoLeadEsperandoPedido(
            leadId, 
            campo_esperando_pedido
        );

        // LIMPIAR el estado de comillas extras (bug de Kommo)
        let estadoBotLimpio = estadoBot;
        if (typeof estadoBot === 'string') {
            estadoBotLimpio = estadoBot.replace(/^["']|["']$/g, '').trim();
        }

        console.log(` Estado actual del bot: "${estadoBotLimpio}" (original: "${estadoBot}")`);

        // SWITCH POR ESTADOS
        switch (estadoBotLimpio) {

            case "esperando_pedido":
                console.log(" Estado confirmado: esperando_pedido");

                if (imagen) {
                    console.log(" Procesando IMAGEN de pedido");
                    return await this.procesarImagenPedido(imagen, leadId);
                }

                if (texto) {
                    console.log(" Procesando TEXTO de pedido");
                    return await this.procesarTextoPedido(texto, leadId);
                }

                console.log(" Mensaje recibido sin texto ni imagen");
                return;

            case null:
            case undefined:
            case "":
                console.log(" Estado vacío o nulo — no se procesa nada.");
                return;

            default:
                console.log(` Estado "${estadoBotLimpio}" no reconocido — no se procesa nada.`);
                return;
        }
    }

    private async procesarTextoPedido(texto: string, leadId: number) {
        console.log(" Procesando texto:", texto);
        console.log("   Lead ID:", leadId);
        //Lógica para procesar texto
    }

    private async procesarImagenPedido(imagen: string, leadId: number) {
        console.log(" Procesando imagen:", imagen);
        console.log("   Lead ID:", leadId);
        // Logica para procesar imagenes
    }
}