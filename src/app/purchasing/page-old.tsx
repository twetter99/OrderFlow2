
"use client";

// We are rendering a client component that uses `useSearchParams`,
// so it needs to be imported and rendered directly. 
// Next.js's Suspense boundary (via loading.tsx) will handle the loading state.
import { PurchasingClientPage } from "@/components/purchasing/purchasing-client-page";

export default function PurchasingPage() {
    return <PurchasingClientPage />;
}
