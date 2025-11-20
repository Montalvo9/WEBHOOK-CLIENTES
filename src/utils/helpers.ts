import stringSimilarity from "string-similarity";
import { timeStamp } from 'console';

/*La funcion normalizar texto: 
-Convierte el nombre a minisculas (lo que le mandan)
-Quita acentos 
-Quita espacios dobles
*/
export function normalizarTexto(texto: string): string {
    const textoLower = texto.toLowerCase();
    const acentos: { [key: string]: string } = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u', 'à': 'a', 'è': 'e', 'ò': 'o'
    };
    return textoLower.replace(/[áéíóúñüàèò]/g, letra => acentos[letra] || letra);
}

/*Función son similares */
export function sonSimilares(a: string, b:string): boolean{
    if(!a || !b) return false; 
    const na = normalizarTexto(a); 
    const nb = normalizarTexto(b);

    const similitud = stringSimilarity.compareTwoStrings(na, nb);

    return similitud >= 0.72;
}



export function extraerDatosContacto(mensaje: string) {
    const datos = {
        nombre: ''
    };

    //Nombre
    const nombreMatch = mensaje.match(/(?:Nombre|Name):?\s*([A-Za-zÀ-ÿ\s.'-]+)/iu);
    
    return datos;
}









//Funcion debugLog: Se encarga de registrar los mensajes en la consola con un formato consistente

export function debugLog(message: string, data?: any) {
    const timestamp = new Date().toDateString();
    const logmessage = `\n[${timestamp}] ${message}`;
    if (data) {
        console.log(logmessage, data);
    } else {
        console.log(logmessage);
    }
}