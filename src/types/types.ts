//La busqueda  de los leads en la base sera por por nombre 
export interface ContactData {
    nombre: string
}


//Datos del lead que se ve en kommo 
export interface LeadData{
    id: number,
    name? : string;
    _embedded?: {
        contacts?: Array<{
            id: number; 
        }>;
    };
}

//Datos del contacto completo 
export interface ContactFullData {
  id?: number;
  name?: string;
  custom_fields_values?: Array<{
    field_id?: number;
    field_code?: string;
    field_name?: string;
    values: Array<{
      value: any; // puede ser string, boolean, number, etc
    }>;
  }>;
}

export interface AccountData{
    subdomain?: string;
}

export interface WebhookPayload {
  message?: {
    add?: Array<{
      text?: string;
    }>;
  };
  leads?: {
    add?: Array<{
      id?: number;
    }>;
  };
  account?: AccountData;
}

// Tipo para las filas de la base de datos
export interface DatabaseRow {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  // Agrega aquí otros campos que tengas en tu tabla 'clientes'
  [key: string]: any; // Para campos adicionales
}

// Tipo para el resultado de MySQL
export interface QueryResult {
  affectedRows?: number;
  insertId?: number;
  warningStatus?: number;
}

// Tipos para las respuestas de la API de Kommo
export interface KommoApiResponse<T = any> {
  data?: T;
  _embedded?: T;
}

export interface KommoLeadResponse extends KommoApiResponse {
  id: number;
  name?: string;
  _embedded?: {
    contacts?: Array<{
      id: number;
    }>;
  };
}

export interface KommoContactResponse extends KommoApiResponse {
  id: number;
  name?: string;
  custom_fields_values?: Array<{
    field_code: string;
    values: Array<{
      value: string;
    }>;
  }>;
}

// Tipo para el campo personalizado en Kommo
export interface CustomFieldValue {
  field_id: number;
  values: Array<{
    value: string | boolean | number;
  }>;
}

// Tipo para actualizar el lead en Kommo
export interface LeadUpdateData {
  custom_fields_values: CustomFieldValue[];
}