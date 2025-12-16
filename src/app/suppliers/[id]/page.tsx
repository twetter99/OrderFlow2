
import { SupplierDetailsClient } from "@/components/suppliers/supplier-details-client";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PurchaseOrder, Supplier, InventoryItem, Project, Location, User } from "@/lib/types";
import { convertPurchaseOrderTimestamps, convertTimestampsToISO } from "@/lib/utils";

async function getSupplierDetails(id: string) {
    const supplierRef = doc(db, "suppliers", id);
    const supplierSnap = await getDoc(supplierRef);

    if (!supplierSnap.exists()) {
        return { supplier: null, purchaseOrders: [], inventory: [], projects: [], locations: [], users: [], suppliers: [] };
    }

    const supplier = { id: supplierSnap.id, ...supplierSnap.data() } as Supplier;

    // Fetch all required data in parallel
    const [poSnapshot, inventorySnapshot, projectsSnapshot, locationsSnapshot, usersSnapshot, suppliersSnapshot] = await Promise.all([
        getDocs(collection(db, "purchaseOrders")),
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "locations")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "suppliers")),
    ]);
    
    const allPurchaseOrders = poSnapshot.docs.map(doc => 
        convertPurchaseOrderTimestamps({ id: doc.id, ...doc.data() })
    );

    const supplierPurchaseOrders = allPurchaseOrders.filter(
        po => po.supplier === supplier.name
    );
    
    const inventory = inventorySnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as InventoryItem);
    const projects = projectsSnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as Project);
    const locations = locationsSnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as Location);
    const users = usersSnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as User);
    const suppliers = suppliersSnapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as Supplier);

    return { supplier, purchaseOrders: supplierPurchaseOrders, inventory, projects, locations, users, suppliers };
}

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
    const { supplier, purchaseOrders, inventory, projects, locations, users, suppliers } = await getSupplierDetails(params.id);

    if (!supplier) {
        return <div className="p-8">No se encontró el proveedor.</div>;
    }

    return <SupplierDetailsClient 
        supplier={supplier} 
        initialPurchaseOrders={purchaseOrders} 
        inventoryItems={inventory}
        projects={projects}
        locations={locations}
        users={users}
        allSuppliers={suppliers}
    />;
}
