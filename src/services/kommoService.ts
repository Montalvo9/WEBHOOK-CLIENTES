import axios from "axios";
import { LeadData, ContactData, AccountData, ContactFullData, CustomFieldValue } from '../types/types';
import { debugLog } from "../utils/helpers";
import colors from 'colors';


export class KommoService {
    private accessToken: string;

    constructor() {
        this.accessToken = process.env.ACCESS_TOKEN || '';
    }

    async obtenerLeadConContactos(leadId: number, subdomain: string): Promise<LeadData | null> {
        const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}?with=contacts`;
        try {
            const respose = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            debugLog('LEAD API Response:', respose.status);
            return respose.data;
        } catch (error) {
            debugLog('Error al obtener el lead:', error);
            return null;
        }
    }

    //OBTENER CONTACTO COMPLETO 
    async obtenerContactoCompleto(contactId: number, subdomain: string): Promise<ContactFullData | null> {
        const url = `https://${subdomain}.kommo.com/api/v4/contacts/${contactId}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            debugLog("Error obteniendo contacto");
            return null;

        }
    }

    /** OBTENER DATOS COMPLETOS () */
    async obtenerDatosCompletos(leadId: number, accountData: AccountData): Promise<{ nombre: string }> {
        const subdomain = accountData.subdomain || 'bitalaal7';
        const datos = { nombre: '' };

        const leadData = await this.obtenerLeadConContactos(leadId, subdomain);

        if (leadData) {
            //Buscar campo personalizado 
            const campoNombreId = parseInt(process.env.CAMPO_NOMBRE_USER || "1493362");
            const campos = leadData.custom_fields_values || [];
            const campoNombre = campos.find(c => c.field_id === campoNombreId);

            if (campoNombre && campoNombre.values?.length > 0) {
                datos.nombre = campoNombre.values[0].value;
                debugLog(colors.bgMagenta("Nombre extraido del campo personalizado"), datos);
                return datos;  //Usamos el nombre ingresado y dejamos de buscar
            }

            //Si no existe el campo personalizado usar el nombre del lead
            // 1) Obtener nombre del lead si no es "Lead #"
            if (leadData.name && !leadData.name.includes('Lead #')) {
                datos.nombre = leadData.name;
            }

            // 2) Si no hay nombre, revisar contactos
            if (!datos.nombre && leadData._embedded?.contacts) {
                for (const contact of leadData._embedded.contacts) {

                    const contactData = await this.obtenerContactoCompleto(contact.id, subdomain);

                    if (contactData && contactData.name) {
                        datos.nombre = contactData.name;
                        break; // Ya tengo nombre, me salgo
                    }
                }
            }
        }

        debugLog('Nombre extraído:', datos);
        return datos;
    }

    async actualizarCampoKommo(
        leadId: number,
        accountData: AccountData,
        existe: boolean,
        campoId: number
    ): Promise<boolean> {
        const subdomain = accountData.subdomain || 'bitalaal7';
        const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`;
        const valor = existe ? "true" : "false";

        const data = {
            custom_fields_values: [
                {
                    field_id: campoId,
                    values: [
                        { value: valor }
                    ]
                }
            ]
        };

        debugLog(`Actualizando campo ${campoId} con: ${valor}`, data);
        try {
            const response = await axios.patch(url, data, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            debugLog('HTTP Code:', response.status);
            debugLog('Response:', response.data);

            return response.status === 200;
        } catch (error: any) {
            debugLog('Error actualizando campo Kommo:', error.response?.data || error.message);
            return false;
        }
    }


    async obtenerCampoLead(leadId: number, campoId: string): Promise<any> {
        const url = `https://bitalaal7.kommo.com/api/v4/leads/${leadId}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const campos = response.data.custom_fields_values || [];
            const campo = campos.find((c: any) => c.field_id == campoId);

            return campo?.values?.[0]?.value || null;

        } catch (error) {
            console.log("Error obteniendo campo:", error);
            return null;
        }
    }

    async actualizarCampoLead(leadId: number, campoId: number, valor: any): Promise<boolean> {
        const url = `https://bitalaal7.kommo.com/api/v4/leads/${leadId}`;

        const data = {
            custom_fields_values: [
                {
                    field_id: campoId,
                    values: [{ value: valor }]
                }
            ]
        };

        try {
            const res = await axios.patch(url, data, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.status === 200;
        } catch (error) {
            console.log("Error actualizando campo:", error);
            return false;
        }
    }

    /* async obtenerCampoEtapaBot(leadId: number, subdomain: string): Promise<string | null> {
         try {
             
             const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}?with=contacts`;
 
 
             const response = await axios.get(url, {
                 headers: {
                     Authorization: `Bearer ${this.accessToken}`,
                     'Content-Type': 'application/json'
                 }
             });
 
             const campos = response.data.custom_fields_values || [];
             const etapaBot = campos.find((c: any) => c.field_id === parseInt(process.env.CAMPO_ETAPA_BOT || "1495418"));
             return etapaBot?.values?.[0]?.value || null;
 
         } catch (err:any) {
              console.log("Error al obtener campo etapa bot:", err.response?.data || err.message);
         return null;
 
         }
     
     }*/


    /*Funciones prueba para webhook global */


    async obtenerLead(leadId: number, subdomain: string): Promise<any | null> {
        if (!leadId || isNaN(leadId)) {
            console.log(" obtenerLead recibió un leadId inválido:", leadId);
            return null;
        }

        const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                }
            });

            return response.data;
        } catch (error: any) {
            console.log("Error obteniendo lead:", error.response?.data || error.message);
            return null;
        }
    }

    async obtenerCampoLeadEsperandoPedido(leadId: number, campoId: string): Promise<any>{
        const url = `https://bitalaal7.kommo.com/api/v4/leads/${leadId}`; 
        try {
             const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const campos = response.data.custom_fields_values || [];
            const campo = campos.find((c: any) => c.field_id == campoId);

            return campo?.values?.[0]?.value || null;
        } catch (error) {
            console.log("Error obteniendo el campo", error);
            
        }


    }



}