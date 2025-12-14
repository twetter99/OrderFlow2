import { getPriceVariations } from "./actions";
import { PriceVariationsClient } from "./price-variations-client";

export default async function PriceVariationsPage() {
  const data = await getPriceVariations();

  return <PriceVariationsClient initialData={data} />;
}
