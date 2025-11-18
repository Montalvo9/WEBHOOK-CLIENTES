import mysql from 'mysql2/promise';
import { ContactData } from '../types/types';
import { normalizarTexto, debugLog } from '../utils/helpers';
import colors from 'colors';


export class DatabaseService {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    })
  }
  /*async verificarEnBaseDatos(datos: ContactData): Promise<boolean> {
    debugLog('--- BÚSQUEDA EN BD ---');

    const condiciones: string[] = [];
    const valores: any[] = [];

    // Nombre
    if (datos.nombre && !datos.nombre.includes('Lead #')) {
      const nombreSinAcentos = normalizarTexto(datos.nombre);

      await this.crearFuncionNormalizacion();

      condiciones.push("normalizar_nombre(nombre) LIKE ?");
      valores.push(`%${nombreSinAcentos}%`);
      debugLog(`→ Nombre: ${datos.nombre}`);
    }

    if (condiciones.length === 0) {
      debugLog('Sin datos para buscar');
      return false;
    }

    const query = `SELECT * FROM clientes WHERE ${condiciones.join(' OR ')}`;

    try {
      // Usar any[] para evitar problemas de tipos
      const [rows] = await this.pool.execute<any[]>(query, valores);
      const existe = Array.isArray(rows) && rows.length > 0;

      if (existe) {
        debugLog('CLIENTE ENCONTRADO', rows[0]);
      } else {
        debugLog('CLIENTE NO ENCONTRADO');
      }

      return existe;
    } catch (error) {
      debugLog('Error en consulta BD:', error);
      return false;
    }
  }*/

 async verificarEnBaseDatos(datos: ContactData): Promise<boolean> {
    // debugLog('--- BÚSQUEDA EN BD ---');
    debugLog(colors.bgYellow('BÚSQUEDA EB LA BASE DE DATOS'));

    if (!datos.nombre || datos.nombre.includes("Lead #")) {
        debugLog("Sin datos válidos para buscar");
        return false;
    }

    // Normalizar texto en JS (sin función SQL)
    const nombreCompleto = normalizarTexto(datos.nombre); // “luis alberto lezama”
    const partes = nombreCompleto.split(" ").filter(p => p.length > 0);  //Separamos por palabras

    if (partes.length === 0) return false;

    const primerNombre = partes[0];                         // “luis”
    const primerApellido = partes[partes.length - 1];       // “lezama”

    debugLog(`→ Nombre procesado: ${primerNombre} ${primerApellido}`);

    const query = `
        SELECT *
        FROM clientes
        WHERE
            LOWER(REPLACE(nombre, 'á', 'a')) LIKE CONCAT('%', ?, '%')
        AND LOWER(REPLACE(apellido, 'á', 'a')) LIKE CONCAT('%', ?, '%')
    `;

    try {
        const [rows] = await this.pool.query<any[]>(query, [
            primerNombre,
            primerApellido
        ]);

        const existe = Array.isArray(rows) && rows.length > 0;

        if (existe) {
            debugLog("CLIENTE ENCONTRADO", rows[0]);
        } else {
            debugLog("CLIENTE NO ENCONTRADO");
        }

        return existe;

    } catch (error) {
        debugLog("Error en consulta BD:", error);
        return false;
    }
}

  /*private async crearFuncionNormalizacion(): Promise<void> {
    const createFunctionSQL = `
      CREATE FUNCTION IF NOT EXISTS normalizar_nombre(texto VARCHAR(255))
      RETURNS VARCHAR(255) DETERMINISTIC
      BEGIN
        RETURN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          LOWER(texto),
          'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),
          'ñ','n'),'ü','u'),'à','a'),'è','e'),'ò','o');
      END
    `;

    try {
      await this.pool.execute(createFunctionSQL);
    } catch (error) {
      debugLog('Error creando función de normalización:', error);
    }
  }*/
}
