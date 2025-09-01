# Documentación de la Aplicación: OrderFlow

OrderFlow es una aplicación web integral diseñada para gestionar y optimizar los procesos de una empresa de instalación de sistemas en vehículos. La plataforma centraliza la gestión de proyectos, inventario, compras, logística y personal técnico, aprovechando la inteligencia artificial para mejorar la toma de decisiones.

A continuación se detallan los módulos principales y sus funcionalidades.

---

## Módulos Principales

### 1. Panel de Control (`/dashboard`)
Es la página de inicio y ofrece una vista rápida del estado general de las operaciones.
- **Tarjetas de Métricas Clave:** Muestra indicadores vitales como el valor total del inventario, el número de proyectos activos, las órdenes de compra pendientes de aprobación y las alertas de stock bajo.
- **Proyectos Activos:** Lista los proyectos que están actualmente "En Progreso", junto con una barra que indica su avance financiero (gasto vs. presupuesto).
- **Órdenes de Compra Recientes:** Tabla con las últimas órdenes de compra generadas, mostrando su estado y valor.

### 2. Gestión de Proyectos
Este conjunto de módulos cubre el ciclo de vida completo de un proyecto, desde la planificación hasta el seguimiento.
- **Gestión de Proyectos (`/projects`):** Permite crear, editar y eliminar proyectos. Cada proyecto se asocia a un cliente, un presupuesto, fechas clave y un equipo técnico.
- **Plantillas de Instalación (`/installation-templates`):** Estandariza los trabajos mediante la creación de plantillas que definen los materiales, herramientas y tiempos estimados para tipos de instalación recurrentes (ej. "Instalación GPS en autobús").
- **Informes de Replanteo (`/replan`):** Permite a los técnicos registrar los detalles específicos de la instalación para cada vehículo de un proyecto, ajustando los materiales o tiempos si hay desviaciones respecto a la plantilla.
- **Planificación de Recursos (`/resource-planning`):** Un panel central para que los gestores de proyecto puedan:
    - Ver el equipo técnico asignado.
    - Analizar las necesidades de material para un proyecto (basado en los informes de replanteo).
    - Comparar las necesidades con el stock disponible y detectar déficits.
    - Generar automáticamente una orden de compra para cubrir los materiales faltantes.
- **Módulos en Desarrollo:** Se incluyen apartados para `Seguimiento y Control`, `Planificación de Desplazamientos` y `Documentación`, que ampliarán las capacidades de gestión de proyectos.

### 3. Logística e Inventario
Este pilar gestiona todos los activos físicos y su ubicación.
- **Inventario (`/inventory`):** Catálogo central de todos los artículos, que pueden ser:
    - **Simples:** Componentes individuales (tornillos, cables, CPUs).
    - **Compuestos (Kits):** Artículos creados a partir de la combinación de artículos simples (ej. "Kit de Instalación Básica"). El sistema calcula el coste y la cantidad "construible" basándose en el stock de sus componentes.
    - **Servicios:** Conceptos no físicos como "Hora de Instalación".
- **Almacenes (`/locations`):** Permite definir múltiples ubicaciones físicas (almacenes, furgonetas). Muestra un resumen del valor y la cantidad de artículos únicos en cada uno.
- **Gestión de Stock por Almacén (`/locations/[id]`):** Vista detallada del inventario de un almacén específico. Permite añadir stock manualmente y realizar transferencias de artículos entre almacenes.

### 4. Adquisiciones
Centraliza el proceso de compras y la relación con los proveedores.
- **Compras (`/purchasing`):**
    - **Creación de Pedidos:** Permite crear órdenes de compra manualmente o con la ayuda de la IA (escribiendo una solicitud en lenguaje natural).
    - **Flujo de Aprobación Automatizado:** Implementa un sistema de estados (Pendiente, Aprobado, Rechazado). Al crear una orden, se envía automáticamente un email al responsable (`juan@winfin.es`) con un enlace seguro para aprobarla con un solo clic. Si no se aprueba en 24 horas, se envía un recordatorio.
    - **Seguimiento de Entregas:** Muestra el estado de la entrega (En Plazo, Próximo a Vencer, Retrasado).
    - **Impresión y Envío:** Genera un formato imprimible de la orden de compra y facilita su envío por email.
- **Proveedores (`/suppliers`):** Módulo para gestionar la información de contacto de los proveedores y sus calificaciones de rendimiento (calidad y entrega).
- **Recepciones de Mercancía (`/receptions`):** Interfaz para que el personal de almacén verifique los pedidos recibidos contra la orden de compra, registre las cantidades exactas y actualice el stock en la ubicación de destino.

### 5. Gestión y Administración
Módulos para la gestión de entidades y usuarios del sistema.
- **Clientes (`/clients`):** CRUD completo para la base de datos de clientes de la empresa.
- **Usuarios (`/users`):** Permite gestionar los usuarios de la aplicación y asignarles roles (Administrador, Empleado, Almacén) para controlar los permisos.

### 6. Inteligencia y Reportes
Este módulo se enfoca en el análisis de datos y la asistencia inteligente.
- **Asistente de IA (`/ai-assistant`):** Proporciona herramientas para:
    - **Sugerir Necesidades de Stock:** Analiza los proyectos futuros y el inventario actual para recomendar compras.
    - **Sugerir Proveedores:** Recomienda los mejores proveedores para un artículo basándose en datos históricos.
    - **Verificar Precios:** Compara el precio de un artículo en una solicitud de compra con el precio promedio del mercado para detectar sobrecostes.
- **Reportes (`/reports`):** Ofrece vistas analíticas de:
    - **Costos de Proyectos:** Compara presupuesto vs. gasto.
    - **Análisis de Inventario:** Clasifica los artículos por su valor total en stock.
    - **Rendimiento de Proveedores:** Analiza el volumen de compra y las calificaciones por proveedor.
    - **Historial de Compras:** Un registro completo de todas las órdenes de compra.
