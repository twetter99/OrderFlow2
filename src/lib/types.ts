import { Timestamp } from "firebase/firestore";

export type Project = {
  id: string;
  codigo_proyecto: string;
  name: string;
  clientId: string;
  client: string; 
  status: 'Planificado' | 'En Progreso' | 'Completado';
  operador_ids?: string[];
  startDate: string; 
  endDate: string; 
  budget?: number; 
  spent?: number; 
  margen_previsto?: number;
  centro_coste: string;
  responsable_proyecto_id?: string; 
  equipo_tecnico_ids?: string[];
  numero_vehiculos: number;
  tipo_flota: 'autobuses' | 'camiones' | 'furgonetas' | 'otros';
  localizacion_base: {
    direccion: string;
    ciudad: string;
    provincia: string;
    coordenadas: { lat: number; lng: number };
  };
  // Campos pre-calculados para seguimiento de costes
  materialsReceived?: number;   // Total materiales recibidos (desde inventory_history)
  materialsCommitted?: number;  // Total materiales comprometidos (órdenes aprobadas/enviadas)
  travelApproved?: number;      // Total viajes aprobados
  travelPending?: number;       // Total viajes pendientes de aprobación
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  supplierProductCode?: string; // Código del producto según el proveedor
  family?: string; // Familia o categoría del producto
  unitCost: number;
  unit: 'ud' | 'ml';
  suppliers?: string[]; // Lista de IDs de proveedores asociados
  type: 'simple' | 'composite' | 'service';
  observations?: string;
  components?: {
    itemId: string;
    quantity: number;
  }[];
  quantity?: number; // Should be calculated, not stored
  minThreshold?: number; // Umbral mínimo para alertas de stock bajo
  isImport?: boolean; // Indica si el producto es de importación
};

export type PurchaseOrderItem = {
  itemId?: string;
  itemSku?: string;
  itemName: string;
  quantity: number;
  price: number;
  unit: string;
  type: 'Material' | 'Servicio';
  supplierProductCode?: string; // Código del producto del proveedor
};

export type StatusHistoryEntry = {
  status: PurchaseOrder['status'];
  date: string | Timestamp;
  comment?: string;
};

// Estructura para albaranes almacenados en Base64
export type DeliveryNoteAttachment = {
  fileName: string;
  fileType: string;
  fileSize: number;
  data: string; // Contenido en Base64
  uploadedAt: string | Timestamp;
};

export type PurchaseOrder = {
  id: string;
  orderNumber?: string;
  project: string; // ID del proyecto
  projectName?: string; // Nombre del proyecto (desnormalizado)
  supplier: string; // Nombre del proveedor (legacy, para compatibilidad)
  supplierId?: string; // ID del proveedor (optimizado)
  supplierName?: string; // Nombre del proveedor (desnormalizado)
  deliveryLocationId: string;
  status: 'Pendiente de Aprobación' | 'Aprobada' | 'Enviada al Proveedor' | 'Recibida' | 'Recibida Parcialmente' | 'Rechazado';
  date: string | Timestamp;
  estimatedDeliveryDate: string | Timestamp;
  total: number;
  items: PurchaseOrderItem[];
  rejectionReason?: string;
  receptionNotes?: string;
  statusHistory?: StatusHistoryEntry[];
  originalOrderId?: string; // ID de la orden original si esta es un backorder
  backorderIds?: string[]; // IDs de los backorders generados desde esta orden
  deliveryNotes?: DeliveryNoteAttachment[]; // Albaranes adjuntos en Base64
  hasDeliveryNotes?: boolean;
  lastDeliveryNoteUpload?: string | Timestamp;
  invoicingStatus?: 'Facturada' | 'Pendiente de facturar';
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  deliveryRating: number;
  qualityRating: number;
};

export type Client = {
  id:string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
};

export type User = {
  uid: string;
  personId?: string; // Para vincular a un técnico o supervisor
  name: string;
  email: string;
  phone?: string | null;
  photoURL?: string | null; 
  providerId?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp | null;
  role?: 'Administrador' | 'Empleado' | 'Almacén' | 'Técnico' | 'Supervisor';
  permissions?: string[]; 
  isDev?: boolean;
};

export type Supervisor = {
    id: string;
    name: string;
    phone: string;
    notes?: string;
    email: string;
};

export type OperadorDepot = {
  id?: string;
  name: string;
  address: string;
};

// Tipo para Operadores (dueños de flotas)
export type Operador = {
  id: string;
  name: string;
  cif?: string;
  phone?: string;
  email?: string;
  address?: string; // Dirección fiscal
  notes?: string;
  depots?: OperadorDepot[]; // Cocheras / Bases operativas
};

export type OperadorRates = {
    rateWorkHour?: number;
    rateTravelHour?: number;
    rateOvertimeWeekdayDay?: number;
    rateOvertimeWeekdayNight?: number;
    rateOvertimeWeekendDay?: number;
    rateOvertimeWeekendNight?: number;
    rateNotes?: string;
}

export type TechnicianCategory = 
 | 'Técnico Ayudante / Auxiliar'
 | 'Técnico Instalador'
 | 'Técnico Integrador de Sistemas Embarcados'
 | 'Técnico de Puesta en Marcha y Pruebas'
 | 'Técnico de Mantenimiento'
 | 'Jefe de Equipo / Encargado de Instalación'
 | 'Técnico de SAT (Servicio de Asistencia Técnica)'
 | 'Técnico de Calidad / Certificación';

export type Technician = {
    id: string;
    name: string;
    phone: string;
    specialty: string;
    category: TechnicianCategory;
    notes?: string;
    rates?: OperadorRates;
    email: string;
}

export type Location = {
  id: string;
  name: string;
  description?: string;
  type: 'physical' | 'mobile';
  street?: string;
  number?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  technicianId?: string; // Optional: associated technician for mobile warehouses
};

export type DeliveryNote = {
  id: string;
  clientId: string;
  projectId: string;
  locationId: string;
  date: string;
  items: {
    itemId: string;
    quantity: number;
  }[];
  status: 'Pendiente' | 'Completado';
};

export type InventoryLocation = {
    id: string;
    itemId: string;
    locationId: string;
    quantity: number;
}

export type Notification = {
    id: string;
    title: string;
    description: string;
    type: 'alert' | 'info';
    link: string;
    isRead: boolean;
}

// Nuevos tipos para Plantillas de Instalación
export type PlantillaInstalacionMaterial = {
  id: string;
  material_id: string; // Foreign key a InventoryItem
  cantidad_estandar: number;
  opcional: boolean;
};

export type PlantillaInstalacionHerramienta = {
  id: string;
  herramienta: string;
  obligatoria: boolean;
};

export type PlantillaInstalacion = {
  id: string;
  nombre: string;
  tipo_vehiculo: 'autobuses' | 'camiones' | 'furgonetas' | 'otros';
  descripcion: string;
  tiempo_estimado_horas: number;
  num_tecnicos_requeridos: number;
  activa: boolean;
  version: number;
  fecha_creacion: string;
  materiales: PlantillaInstalacionMaterial[];
  herramientas: PlantillaInstalacionHerramienta[];
};

// Nuevos tipos para Informe de Replanteo
export type ReplanteoMaterial = {
  id: string;
  replanteo_id: string;
  material_id: string;
  cantidad_prevista: number;
  justificacion_cambio?: string;
};

export type ReplanteoImagen = {
  id: string;
  replanteo_id: string;
  tipo: 'estado_inicial' | 'esquema' | 'detalle';
  url_imagen: string;
  descripcion: string;
};

export type Replanteo = {
  id: string;
  proyecto_id: string;
  vehiculo_identificacion: string;
  matricula: string;
  fecha_replanteo: string;
  tecnico_responsable_id: string;
  plantilla_base_id: string;
  tiempo_estimado_ajustado: number;
  observaciones: string;
  estado: 'Pendiente' | 'En Proceso' | 'Completado';
  materiales: ReplanteoMaterial[];
  imagenes: ReplanteoImagen[];
};

// --- Tipos para los nuevos módulos ---

export type SupplierInvoice = {
  id: string;
  purchaseOrderIds: string[];
  deliveryNoteId?: string;
  invoiceNumber: string;
  supplierId: string;
  emissionDate: string | Date;
  dueDate: string | Date;
  bases: { baseAmount: number; vatRate: number }[];
  vatAmount: number;
  totalAmount: number;
  status: 'Pendiente de validar' | 'Validada' | 'Disputada' | 'Pendiente de pago' | 'Pagada';
  attachment?: DeliveryNoteAttachment;
  notes?: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  dueDate: string;
  amountDue: number;
  paymentMethod: 'Transferencia' | 'Confirming' | 'Otro';
  status: 'Pendiente' | 'Pagado parcialmente' | 'Pagado total';
  paymentHistory?: {
    date: string;
    amount: number;
    reference: string;
  }[];
};

export type ReminderType = 'po-approval' | 'invoice-due' | 'stock-alert';

export type Reminder = {
  id: string;
  type: ReminderType;
  relatedId: string; // ID del PO, factura, etc.
  recipient: string; // email
  status: 'Pendiente' | 'Enviado' | 'Fallido' | 'Cancelado';
  createdAt: string | Timestamp;
  sendAt: string | Timestamp;
  attempts: number;
};

export type ReminderSetting = {
  id: ReminderType;
  isActive: boolean;
  frequencyHours: number;
  maxAttempts: number;
};

export type ReminderHistory = {
  id: string;
  reminderId: string;
  sentAt: string | Timestamp;
  status: 'Éxito' | 'Fallido';
  details?: string;
};

// --- Tipos para el nuevo módulo de Gastos de Viaje ---

export type GastoDetallado = {
  id: string; // ID único para el gasto (ej. generado en el cliente)
  fecha: string | Timestamp;
  tipo: 'Alojamiento' | 'Combustible' | 'Peajes' | 'Dietas' | 'Transporte' | 'Otros';
  descripcion: string;
  importe: number;
  url_ticket?: string; // URL al ticket/factura en Firebase Storage
};

export type InformeViaje = {
  id: string;
  codigo_informe: string; // Un número secuencial, ej: "VIAJE-2025-001"
  proyecto_id: string; // ID del proyecto al que se imputa
  proyecto_name: string; // Desnormalizado, como haces con las POs
  tecnico_id: string; // ID del técnico que realiza el gasto
  tecnico_name: string; // Desnormalizado
  operador_id?: string; // Opcional: A qué operador fue a visitar
  fecha_inicio: string | Timestamp;
  fecha_fin: string | Timestamp;
  descripcion_viaje: string;
  gastos: GastoDetallado[]; // Array con todos los gastos
  total_informe: number; // Suma de todos los gastos
  estado: 'Pendiente de Aprobación' | 'Aprobado' | 'Rechazado';
  notas_aprobacion?: string; // Razón de rechazo, etc.
  aprobado_por?: string; // UID del admin que aprueba
  fecha_aprobacion?: string | Timestamp;
};

// --- Tipos para el módulo de Inteligencia de Precios ---

export type InventoryHistoryEntry = {
  id: string;
  itemId: string;           // ID del artículo del inventario
  itemSku: string;          // SKU del artículo (desnormalizado)
  itemName: string;         // Nombre del artículo (desnormalizado)
  supplierId: string;       // ID del proveedor
  supplierName: string;     // Nombre del proveedor (desnormalizado)
  purchaseOrderId: string;  // ID de la orden de compra
  orderNumber: string;      // Número de orden (desnormalizado)
  quantity: number;         // Cantidad comprada
  unitPrice: number;        // Precio unitario en esa compra
  totalPrice: number;       // Precio total (quantity * unitPrice)
  unit: string;             // Unidad de medida
  date: string | Timestamp; // Fecha de la compra/recepción
  projectId?: string;       // ID del proyecto asociado (opcional)
  projectName?: string;     // Nombre del proyecto (desnormalizado)
};

export type PriceMetrics = {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalPurchases: number;
  totalQuantity: number;
  totalSpent: number;
  priceVariation: number;   // Porcentaje de variación (max-min)/avg * 100
  lastPrice: number;
  lastPurchaseDate: string;
};