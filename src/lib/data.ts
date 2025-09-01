
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Project, InventoryItem, PurchaseOrder, Supplier, User, Client, Location, DeliveryNote, InventoryLocation, Notification, PlantillaInstalacion, Replanteo, Technician, Operador, Supervisor, SupplierInvoice, Payment } from './types';
import { add, sub } from 'date-fns';
import { convertTimestampsToISO } from './utils';

const today = new Date();

// --- Default Mock Data ---

export const productFamilies = [
    { name: 'Cableado', description: 'Todo tipo de cables eléctricos, datos UTP, coaxiales, etc.' },
    { name: 'Conectores', description: 'Conectores para cables, terminales tipo faston, fichas de empalme, RJ45, etc.' },
    { name: 'Terminales', description: 'Terminales, pines y otros terminales para conexión de cables.' },
    { name: 'Tubos', description: 'Tubo corrugado, abierto, canaletas y otros sistemas de canalización.' },
    { name: 'Bridas', description: 'Bridas y bases de nylon y accesorios de sujeción de cables.' },
    { name: 'Harting', description: 'Conectores industriales y accesorios de la marca Harting.' },
    { name: 'Herrajes', description: 'Soportes, escuadras, anclajes, perfiles y elementos de fijación metálica.' },
    { name: 'Tornillería', description: 'Tornillos, tuercas, arandelas y sistemas de fijación.' },
    { name: 'Borneros Wago', description: 'Bornas, puentes y tapas para placa de conexiones.' },
    { name: 'Equipos', description: 'Dispositivos electrónicos y eléctricos: routers, switches, cámaras, pantallas, fuentes de alimentación, etc.' },
    { name: 'Herramientas', description: 'Herramientas manuales y eléctricas necesarias para la instalación y el mantenimiento: destornilladores, taladros, pelacables, etc.' },
    { name: 'Papercast', description: 'Pantallas y componentes específicos de la marca Papercast.' },
    { name: 'Vision360', description: 'Equipos y componentes del sistema Vision360 para visión artificial y asistencia avanzada en vehículos.' },
    { name: 'Afluencia360', description: 'Equipos y componentes del sistema Afluencia360 para análisis de afluencia y movilidad en transporte público.' },
    { name: 'Varios', description: 'Materiales diversos y consumibles no categorizados en las familias anteriores.' },
];

export const projects: Project[] = [
  {
    id: 'WF-PROJ-001',
    codigo_proyecto: 'P24-FLOTA-A-MAD',
    name: 'Actualización Flota A de Autobuses',
    clientId: 'WF-CLI-001',
    client: 'Tránsito de la Ciudad',
    status: 'En Progreso',
    tipo_flota: 'autobuses',
    numero_vehiculos: 50,
    localizacion_base: {
      direccion: 'Calle de la Flota, 123',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      coordenadas: { lat: 40.416775, lng: -3.703790 }
    },
    startDate: '2024-05-01',
    endDate: '2024-08-31',
    budget: 50000,
    spent: 23000,
    margen_previsto: 0.15,
    centro_coste: 'CC-INST-VEH',
    responsable_proyecto_id: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2',
    equipo_tecnico_ids: ['WF-TECH-001', 'WF-TECH-002'],
    operador_ids: ['WF-OP-001']
  },
  {
    id: 'WF-PROJ-002',
    codigo_proyecto: 'P24-TURISMO-BCN',
    name: 'Instalación Nuevo Autobús Turístico',
    clientId: 'WF-CLI-002',
    client: 'Compañía de Turismo',
    status: 'En Progreso',
    tipo_flota: 'autobuses',
    numero_vehiculos: 5,
    localizacion_base: {
      direccion: 'Avinguda del Port, 45',
      ciudad: 'Barcelona',
      provincia: 'Barcelona',
      coordenadas: { lat: 41.385063, lng: 2.173404 }
    },
    startDate: '2024-06-15',
    endDate: '2024-09-15',
    budget: 25000,
    spent: 18500,
    margen_previsto: 0.20,
    centro_coste: 'CC-PROY-ESP',
    responsable_proyecto_id: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2',
    equipo_tecnico_ids: ['WF-TECH-001']
  },
  {
    id: 'WF-PROJ-003',
    codigo_proyecto: 'P24-ESCOLARES-SVQ',
    name: 'Sistema de Seguridad para Autobús Escolar',
    clientId: 'WF-CLI-003',
    client: 'Junta Escolar del Distrito',
    status: 'Planificado',
    tipo_flota: 'autobuses',
    numero_vehiculos: 200,
    localizacion_base: {
      direccion: 'Plaza de España, s/n',
      ciudad: 'Sevilla',
      provincia: 'Sevilla',
      coordenadas: { lat: 37.38283, lng: -5.97317 }
    },
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    budget: 75000,
    spent: 0,
    margen_previsto: 0.18,
    centro_coste: 'CC-SEGURIDAD',
    responsable_proyecto_id: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2',
    equipo_tecnico_ids: []
  },
  {
    id: 'WF-PROJ-004',
    codigo_proyecto: 'P24-MANT-001',
    name: 'Mantenimiento de Rutina',
    clientId: 'WF-CLI-001',
    client: 'Tránsito de la Ciudad',
    status: 'Completado',
    tipo_flota: 'otros',
    numero_vehiculos: 10,
    localizacion_base: {
      direccion: 'Calle de la Flota, 123',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      coordenadas: { lat: 40.416775, lng: -3.703790 }
    },
    startDate: '2024-04-01',
    endDate: '2024-04-30',
    budget: 10000,
    spent: 9800,
    margen_previsto: 0.12,
    centro_coste: 'CC-MANT',
    responsable_proyecto_id: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2',
    equipo_tecnico_ids: ['WF-TECH-002']
  },
];
export const inventory: InventoryItem[] = [
  { id: 'ITEM-001', sku: 'CPU-45', name: 'Unidad Central de Procesamiento v4.5', family: 'Equipos', unitCost: 350, unit: 'ud', suppliers: ['WF-SUP-001'], type: 'simple', observations: 'Componente principal para la mayoría de kits.' },
  { id: 'ITEM-002', sku: 'BRKT-SML', name: 'Soporte de Montaje Pequeño', family: 'Herrajes', unitCost: 15.50, unit: 'ud', suppliers: ['WF-SUP-002'], type: 'simple' },
  { id: 'ITEM-003', sku: 'CONN-PLT-01', name: 'Placa de Conexión Principal', family: 'Herrajes', unitCost: 45, unit: 'ud', suppliers: ['WF-SUP-002'], type: 'simple' },
  { id: 'ITEM-004', sku: 'SCRW-M5', name: 'Paquete de Tornillos M5 (100ct)', family: 'Tornillería', unitCost: 8, unit: 'ud', suppliers: ['WF-SUP-003'], type: 'simple' },
  { id: 'ITEM-005', sku: 'GPS-MOD-2', name: 'Módulo GPS v2', family: 'Equipos', unitCost: 120, unit: 'ud', suppliers: ['WF-SUP-004'], type: 'simple' },
  { id: 'ITEM-006', sku: 'CAM-SEC-HD', name: 'Cámara de Seguridad HD', family: 'Equipos', unitCost: 85, unit: 'ud', suppliers: ['WF-SUP-001'], type: 'simple' },
  { id: 'ITEM-007', sku: 'CBL-PWR-10M', name: 'Cable de Alimentación 2-hilos', family: 'Cableado', unitCost: 2.5, unit: 'ml', suppliers: ['WF-SUP-001'], type: 'simple' },
  { id: 'ITEM-101', sku: 'SERV-INST-HR', name: 'Hora de Instalación Técnica', unitCost: 75, unit: 'ud', type: 'service' },
  {
    id: 'ITEM-100',
    sku: 'KIT-INST-BASIC',
    name: 'Kit de Instalación Básico',
    unitCost: 478, // Costo es la suma de los componentes
    unit: 'ud',
    type: 'composite',
    components: [
      { itemId: 'ITEM-001', quantity: 1 }, // 1x CPU
      { itemId: 'ITEM-005', quantity: 1 }, // 1x GPS
      { itemId: 'ITEM-004', quantity: 1 }, // 1x Paquete de tornillos
    ]
  },
];
export const purchaseOrders: PurchaseOrder[] = [
    { id: 'WF-PO-2024-001', ...convertTimestampsToISO({ project: 'WF-PROJ-001', supplier: 'TechParts Inc.', status: 'Recibida', date: new Date('2024-07-10'), total: 3500, items: [{ itemId: 'ITEM-001', itemName: 'Unidad Central de Procesamiento v4.5', quantity: 10, price: 350, unit: 'ud', type: 'Material' }], estimatedDeliveryDate: sub(today, { days: 5 }) })},
    { id: 'WF-PO-2024-002', ...convertTimestampsToISO({ project: 'WF-PROJ-002', supplier: 'MetalWorks Ltd.', status: 'Enviada al Proveedor', date: new Date('2024-07-12'), total: 775, items: [{ itemId: 'ITEM-002', itemName: 'Soporte de Montaje Pequeño', quantity: 50, price: 15.50, unit: 'ud', type: 'Material' }], estimatedDeliveryDate: add(today, { days: 2 }) })},
    { id: 'WF-PO-2024-003', ...convertTimestampsToISO({ project: 'WF-PROJ-001', supplier: 'Global Nav', status: 'Pendiente de Aprobación', date: new Date('2024-07-15'), total: 1200, items: [{ itemId: 'ITEM-005', itemName: 'Módulo GPS v2', quantity: 10, price: 120, unit: 'ud', type: 'Material' }], estimatedDeliveryDate: add(today, { days: 10 }) })},
    { id: 'WF-PO-2024-004', ...convertTimestampsToISO({ project: 'WF-PROJ-002', supplier: 'Soluciones de Ferretería', status: 'Rechazado', date: new Date('2024-07-18'), total: 160, items: [{ itemId: 'ITEM-004', itemName: 'Paquete de Tornillos M5 (100ct)', quantity: 20, price: 8, unit: 'ud', type: 'Material' }], rejectionReason: 'El precio es superior al acordado en el presupuesto.', estimatedDeliveryDate: sub(today, { days: 1 }) })},
    { id: 'WF-PO-2024-005', ...convertTimestampsToISO({ project: 'WF-PROJ-003', supplier: 'TechParts Inc.', status: 'Aprobada', date: new Date('2024-07-20'), total: 2550, items: [{ itemId: 'ITEM-006', itemName: 'Cámara de Seguridad HD', quantity: 30, price: 85, unit: 'ud', type: 'Material' }], estimatedDeliveryDate: add(today, { days: 20 }) })},
    { id: 'WF-PO-2024-006', ...convertTimestampsToISO({ project: 'WF-PROJ-001', supplier: 'MetalWorks Ltd.', status: 'Recibida', date: new Date('2024-07-21'), total: 900, items: [{ itemId: 'ITEM-003', itemName: 'Placa de Conexión Principal', quantity: 20, price: 45, unit: 'ud', type: 'Material' }], estimatedDeliveryDate: sub(today, { days: 2 }) })},
    { id: 'WF-PO-2024-007', ...convertTimestampsToISO({ project: 'WF-PROJ-002', supplier: 'Viajes Corporativos', status: 'Aprobada', date: new Date('2024-07-22'), total: 875, items: [
      { itemName: 'Vuelo Ida y Vuelta Madrid-Barcelona Técnico', quantity: 1, price: 250, unit: 'viaje', type: 'Servicio' },
      { itemName: 'Hotel 2 noches en Barcelona', quantity: 2, price: 150, unit: 'noche', type: 'Servicio' },
      { itemName: 'Alquiler de coche 3 días', quantity: 1, price: 325, unit: 'ud', type: 'Servicio' },
    ], estimatedDeliveryDate: new Date() })},
];
export const suppliers: Supplier[] = [
  { id: 'WF-SUP-001', name: 'TechParts Inc.', contactPerson: 'Jane Doe', email: 'sales@techparts.com', phone: '123-456-7890', deliveryRating: 4.5, qualityRating: 4.8 },
  { id: 'WF-SUP-002', name: 'MetalWorks Ltd.', contactPerson: 'John Smith', email: 'contact@metalworks.com', phone: '987-654-3210', deliveryRating: 4.2, qualityRating: 4.5 },
  { id: 'WF-SUP-003', name: 'Soluciones de Ferretería', contactPerson: 'Peter Jones', email: 'orders@hardwaresolutions.com', phone: '555-123-4567', deliveryRating: 4.8, qualityRating: 4.3 },
  { id: 'WF-SUP-004', name: 'Global Nav', contactPerson: 'Susan Chen', email: 'support@globalnav.com', phone: '555-987-6543', deliveryRating: 4.0, qualityRating: 4.7 },
  { id: 'WF-SUP-005', name: 'Ensamblado Interno', contactPerson: 'N/A', email: 'N/A', phone: 'N/A', deliveryRating: 5.0, qualityRating: 5.0 },
  { id: 'WF-SUP-006', name: 'Viajes Corporativos', contactPerson: 'Agencia de Viajes', email: 'reservas@viajescorp.com', phone: '555-555-5555', deliveryRating: 5.0, qualityRating: 5.0 },
];
export const clients: Client[] = [
    { id: 'WF-CLI-001', name: 'Tránsito de la Ciudad', contactPerson: 'Carlos Ruiz', email: 'c.ruiz@transitociudad.gov', phone: '611-222-3333' },
    { id: 'WF-CLI-002', name: 'Compañía de Turismo', contactPerson: 'Ana Torres', email: 'ana.torres@turismo.com', phone: '622-333-4444' },
    { id: 'WF-CLI-003', name: 'Junta Escolar del Distrito', contactPerson: 'Maria Lopez', email: 'm.lopez@juntaescolar.edu', phone: '633-444-5555' },
];
export const users: User[] = [
  { 
    uid: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2', 
    personId: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2',
    name: 'Juan Winfin', 
    email: 'juan@winfin.es', 
    phone: '111-222-3333', 
    permissions: [
        'dashboard', 'projects', 'inventory', 'purchasing', 'users', 'supervisores', 'settings',
        'installation-templates', 'replan', 'resource-planning', 'travel-planning', 'locations',
        'receptions', 'despatches', 'completed-orders', 'suppliers', 'supplier-invoices',
        'payments', 'project-tracking', 'reports', 'documentation', 'ai-assistant',
        'clients', 'operadores', 'technicians', 'approval-flows', 'reminders'
    ] 
  },
  { 
    uid: 'gH7jKlM9nBvC1xZ2a3s4d5f6g7h8', 
    name: 'Warehouse Staff', 
    email: 'warehouse@orderflow.com', 
    phone: '444-555-6666', 
    permissions: ['inventory', 'locations', 'receptions'] 
  },
  { 
    uid: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4', 
    name: 'Solicitante Ejemplo', 
    email: 'solicitante@orderflow.com', 
    phone: '777-888-9999', 
    permissions: ['purchasing'] 
  },
];
export const supervisors: Supervisor[] = [
    { id: 'hstmO2zM2JQDRnbrvjJHPz3i3nj2', name: 'Juan Winfin', phone: '600-111-222', notes: 'Supervisor general.', email: 'juan@winfin.es'},
    { id: 'WF-SUPV-001', name: 'Laura Martín', phone: '600-111-222', notes: 'Supervisora de zona centro.', email: 'lmartin@winfin.es'},
    { id: 'WF-SUPV-002', name: 'Roberto Sánchez', phone: '600-333-444', notes: 'Supervisor de grandes cuentas.', email: 'rsanchez@winfin.es'},
];
export const technicians: Technician[] = [
    { id: 'WF-TECH-001', name: 'Mario García', phone: '655-444-333', specialty: 'Electrónica', category: 'Técnico Integrador de Sistemas Embarcados', email: 'mgarcia@winfin.es' },
    { id: 'WF-TECH-002', name: 'Laura Jimenez', phone: '655-111-222', specialty: 'GPS y Comunicaciones', category: 'Técnico de SAT (Servicio de Asistencia Técnica)', email: 'ljimenez@winfin.es' },
];
export const operadores: Operador[] = [
    {
      id: 'WF-OP-001',
      name: 'Instalaciones Electrónicas Avanzadas S.L.',
      cif: 'B-12345678',
      phone: '911 23 45 67',
      email: 'facturacion@iea-sl.com',
      address: 'Calle de la Innovación, 1, 28010 Madrid',
      notes: 'Operador principal para proyectos en la comunidad de Madrid.',
      depots: [
          { id: 'DEPOT-01', name: 'Cochera Central', address: 'Calle de la Logística, 42, Getafe' },
          { id: 'DEPOT-02', name: 'Base Norte', address: 'Avenida de la Industria, 1, Alcobendas' }
      ]
    },
];
export const locations: Location[] = [
    { id: 'LOC-001', name: 'Almacén Principal', description: 'Almacén principal para componentes generales.' },
    { id: 'LOC-002', name: 'Almacén Secundario', description: 'Almacén para componentes electrónicos sensibles.' },
    { id: 'LOC-003', name: 'Zona de Recepción', description: 'Mercancía pendiente de clasificar.' },
];
export const inventoryLocations: InventoryLocation[] = [
    { id: 'INVLOC-001', itemId: 'ITEM-001', locationId: 'LOC-002', quantity: 15 },
    { id: 'INVLOC-002', itemId: 'ITEM-001', locationId: 'LOC-003', quantity: 10 },
    { id: 'INVLOC-003', itemId: 'ITEM-002', locationId: 'LOC-001', quantity: 8 },
    { id: 'INVLOC-004', itemId: 'ITEM-003', locationId: 'LOC-001', quantity: 55 },
    { id: 'INVLOC-005', itemId: 'ITEM-004', locationId: 'LOC-001', quantity: 200 },
    { id: 'INVLOC-006', itemId: 'ITEM-005', locationId: 'LOC-002', quantity: 12 },
    { id: 'INVLOC-007', itemId: 'ITEM-006', locationId: 'LOC-002', quantity: 30 },
    { id: 'INVLOC-008', itemId: 'ITEM-007', locationId: 'LOC-001', quantity: 150 },
];
export const deliveryNotes: DeliveryNote[] = [
    { id: 'WF-DN-2024-0001', clientId: 'WF-CLI-001', projectId: 'WF-PROJ-001', date: '2024-07-20', status: 'Completado', locationId: 'LOC-002', items: [{itemId: 'ITEM-001', quantity: 5}, {itemId: 'ITEM-004', quantity: 10}] },
    { id: 'WF-DN-2024-0002', clientId: 'WF-CLI-002', projectId: 'WF-PROJ-002', date: '2024-07-22', status: 'Completado', locationId: 'LOC-001', items: [{itemId: 'ITEM-002', quantity: 20}, {itemId: 'ITEM-003', quantity: 15}] },
]
export const installationTemplates: PlantillaInstalacion[] = [
  {
    id: 'TPL-001',
    nombre: 'Instalación Básica GPS Autobús Urbano',
    tipo_vehiculo: 'autobuses',
    descripcion: 'Plantilla estándar para la instalación del sistema de seguimiento GPS en autobuses urbanos. Incluye la unidad central y la antena.',
    tiempo_estimado_horas: 2.5,
    num_tecnicos_requeridos: 1,
    activa: true,
    version: 1,
    fecha_creacion: '2023-10-15T09:00:00Z',
    materiales: [
      { id: 'MAT-001', material_id: 'ITEM-100', cantidad_estandar: 1, opcional: false }, // Kit de Instalación Básico
    ],
    herramientas: [
      { id: 'HER-001', herramienta: 'Juego de destornilladores de precisión', obligatoria: true },
      { id: 'HER-002', herramienta: 'Multímetro digital', obligatoria: true },
      { id: 'HER-003', herramienta: 'Taladro inalámbrico con juego de brocas', obligatoria: true },
    ],
  },
  {
    id: 'TPL-002',
    nombre: 'Instalación Completa Seguridad Camión Larga Distancia',
    tipo_vehiculo: 'camiones',
    descripcion: 'Instalación completa que incluye GPS, 4 cámaras de seguridad y sistema de bloqueo remoto.',
    tiempo_estimado_horas: 6,
    num_tecnicos_requeridos: 2,
    activa: true,
    version: 2,
    fecha_creacion: '2024-02-20T14:30:00Z',
    materiales: [
      { id: 'MAT-002', material_id: 'ITEM-100', cantidad_estandar: 1, opcional: false },
      { id: 'MAT-003', material_id: 'ITEM-006', cantidad_estandar: 4, opcional: false },
      { id: 'MAT-004', material_id: 'ITEM-007', cantidad_estandar: 20, opcional: false },
    ],
    herramientas: [
      { id: 'HER-004', herramienta: 'Juego de llaves de vaso', obligatoria: true },
      { id: 'HER-005', herramienta: 'Herramienta de crimpado de terminales', obligatoria: true },
    ],
  },
];
export const replanteos: Replanteo[] = [
  {
    id: 'RE-001',
    proyecto_id: 'WF-PROJ-001',
    vehiculo_identificacion: 'Autobús #345',
    matricula: '1234 ABC',
    fecha_replanteo: '2024-07-10',
    tecnico_responsable_id: 'WF-TECH-001',
    plantilla_base_id: 'TPL-001',
    tiempo_estimado_ajustado: 3.0,
    observaciones: 'El espacio para la CPU es reducido, se necesita un soporte de montaje modificado. Se requiere cableado adicional.',
    estado: 'Completado',
    materiales: [
      { id: 'RE-MAT-001', replanteo_id: 'RE-001', material_id: 'ITEM-100', cantidad_prevista: 1 },
      { id: 'RE-MAT-002', replanteo_id: 'RE-001', material_id: 'ITEM-002', cantidad_prevista: 1, justificacion_cambio: 'Soporte estándar no cabe' },
      { id: 'RE-MAT-003', replanteo_id: 'RE-001', material_id: 'ITEM-007', cantidad_prevista: 2, justificacion_cambio: 'Extensión de cableado necesaria' }
    ],
    imagenes: [
      { id: 'RE-IMG-001', replanteo_id: 'RE-001', tipo: 'estado_inicial', url_imagen: 'https://placehold.co/600x400.png', descripcion: 'Vista del salpicadero antes de la instalación.' },
      { id: 'RE-IMG-002', replanteo_id: 'RE-001', tipo: 'esquema', url_imagen: 'https://placehold.co/600x400.png', descripcion: 'Diagrama de la nueva ubicación de la CPU.' }
    ]
  },
  {
    id: 'RE-002',
    proyecto_id: 'WF-PROJ-001',
    vehiculo_identificacion: 'Autobús #346',
    matricula: '1235 ABC',
    fecha_replanteo: '2024-07-11',
    tecnico_responsable_id: 'WF-TECH-002',
    plantilla_base_id: 'TPL-001',
    tiempo_estimado_ajustado: 2.5,
    observaciones: 'Instalación estándar. Sin desviaciones.',
    estado: 'Pendiente',
    materiales: [
      { id: 'RE-MAT-004', replanteo_id: 'RE-002', material_id: 'ITEM-100', cantidad_prevista: 1 }
    ],
    imagenes: []
  }
];
export const supplierInvoices: SupplierInvoice[] = [
  { id: 'INV-001', purchaseOrderIds: ['WF-PO-2024-001'], invoiceNumber: 'FACT-TECH-501', supplierId: 'WF-SUP-001', emissionDate: '2024-07-11', dueDate: '2024-08-10', bases: [{baseAmount: 3500, vatRate: 0.21}], vatAmount: 735, totalAmount: 4235, status: 'Pagada', totalAmountDifference: 0},
  { id: 'INV-002', purchaseOrderIds: ['WF-PO-2024-002'], invoiceNumber: 'MW-INV-982', supplierId: 'WF-SUP-002', emissionDate: '2024-07-15', dueDate: '2024-08-14', bases: [{baseAmount: 775, vatRate: 0.21}], vatAmount: 162.75, totalAmount: 937.75, status: 'Pendiente de pago', totalAmountDifference: 0 },
  { id: 'INV-003', purchaseOrderIds: ['WF-PO-2024-005'], invoiceNumber: 'FACT-TECH-508', supplierId: 'WF-SUP-001', emissionDate: '2024-07-22', dueDate: '2024-08-21', bases: [{baseAmount: 2550, vatRate: 0.21}], vatAmount: 535.50, totalAmount: 3085.50, status: 'Validada', totalAmountDifference: 0},
  { id: 'INV-004', purchaseOrderIds: ['WF-PO-2024-006'], invoiceNumber: 'MW-INV-991', supplierId: 'WF-SUP-002', emissionDate: '2024-07-22', dueDate: '2024-08-21', bases: [{baseAmount: 900, vatRate: 0.21}], vatAmount: 189, totalAmount: 1089, status: 'Pendiente de validar', totalAmountDifference: 0 },
];
export const payments: Payment[] = [
    { id: 'PAY-001', invoiceId: 'INV-001', invoiceNumber: 'FACT-TECH-501', supplierName: 'TechParts Inc.', dueDate: sub(today, {days: 15}).toISOString(), amountDue: 4235, paymentMethod: 'Transferencia', status: 'Pagado total', paymentHistory: [{ date: sub(today, {days: 15}).toISOString(), amount: 4235, reference: 'TR-2024-5821' }] },
    { id: 'PAY-002', invoiceId: 'INV-002', invoiceNumber: 'MW-INV-982', supplierName: 'MetalWorks Ltd.', dueDate: add(today, {days: 12}).toISOString(), amountDue: 937.75, paymentMethod: 'Transferencia', status: 'Pendiente' },
    { id: 'PAY-003', invoiceId: 'INV-003', invoiceNumber: 'FACT-TECH-508', supplierName: 'TechParts Inc.', dueDate: add(today, {days: 35}).toISOString(), amountDue: 3085.50, paymentMethod: 'Confirming', status: 'Pendiente' },
    { id: 'PAY-004', invoiceId: 'INV-004', invoiceNumber: 'MW-INV-991', supplierName: 'MetalWorks Ltd.', dueDate: sub(today, {days: 2}).toISOString(), amountDue: 1089, paymentMethod: 'Transferencia', status: 'Pendiente' },
    { id: 'PAY-005', invoiceId: 'INV-005', invoiceNumber: 'FACT-TECH-512', supplierName: 'TechParts Inc.', dueDate: add(today, {days: 5}).toISOString(), amountDue: 5000, paymentMethod: 'Transferencia', status: 'Pagado parcialmente', paymentHistory: [{ date: sub(today, {days: 1}).toISOString(), amount: 2500, reference: 'TR-2024-5911' }] },
];

/**
 * Función para obtener datos de una colección de Firestore.
 * Si la colección está vacía o hay un error, devuelve datos de prueba.
 * @param collectionName El nombre de la colección en Firestore.
 * @param mockData Los datos de prueba a devolver en caso de fallo.
 * @returns Una promesa que se resuelve con los datos de la colección o los datos de prueba.
 */
export async function getData<T>(collectionName: string, mockData: T[]): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    if (querySnapshot.empty) {
      console.warn(`Firestore collection '${collectionName}' is empty. Using mock data.`);
      return mockData;
    }
    const data = querySnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as T);
    return data;
  } catch (error) {
    console.error(`Error fetching data from '${collectionName}':`, error);
    console.log(`Falling back to mock data for '${collectionName}'.`);
    return mockData;
  }
}


// Generador de notificaciones dinámicas
export const getNotifications = (): Notification[] => {
    const notifications: Notification[] = [];

    // Notificaciones de aprobación de PO
    purchaseOrders.filter(po => po.status === 'Pendiente de Aprobación').forEach(po => {
        notifications.push({
            id: `notif-po-${po.id}`,
            title: 'Aprobación Requerida',
            description: `El pedido ${po.orderNumber} necesita tu revisión.`,
            type: 'alert',
            link: '/purchasing',
            isRead: false
        });
    });

    // Notificaciones de stock bajo
    inventory.filter(item => {
        if (item.type === 'composite') return false; // Por ahora, solo items simples
        const totalQuantity = inventoryLocations
          .filter(loc => loc.itemId === item.id)
          .reduce((sum, loc) => sum + loc.quantity, 0);
        return totalQuantity < (item.minThreshold || 0);
    }).forEach(item => {
        notifications.push({
            id: `notif-stock-${item.id}`,
            title: 'Stock Bajo',
            description: `El artículo ${item.name} (${item.sku}) está por debajo del umbral.`,
            type: 'info',
            link: '/inventory',
            isRead: false
        });
    });
    
    return notifications;
}
