
// This file can be used to display a detailed view of a single purchase order.
// For now, we will redirect back to the main purchasing page as the details
// are handled in a modal.

import { redirect } from 'next/navigation'

export default function PurchaseOrderDetailPage() {
  redirect('/purchasing')
}
