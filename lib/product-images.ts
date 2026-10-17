const PRODUCT_IMAGE_BY_NAME: Record<string, string> = {
  "a4 printing paper (ream)": "A4 printing paper(ream)_result_result.webp",
  "a4 exercise book 96pg": "exercise book 96pg_result_result.webp",
  "ballpoint pen (blue)": "Ballpoint pen(blue)_result_result.webp",
  "bar soap 200g": "Bar Soap 200g_result_result.webp",
  "biscuits pack": "Biscuits Pack_result_result.webp",
  "bottled water 500ml": "bottled water 500ml_result_result.webp",
  "candle (pack of 6)": "candle (park of 6)_result_result.webp",
  "chocolate bar": "chocolate bar_result_result.webp",
  "cooking oil 1l": "cooking oil 1L_result_result.webp",
  "energy drink 330ml": "Energy drink 300ml_result_result.webp",
  "fresh juice 1l": "Fresh Juice 1L_result_result.webp",
  "laundry detergent 500g": "laundry detergent_result_result.webp",
  "pencil hb": "pencil HB_result_result.webp",
  "potato crisps 50g": "Potato Crisps_result_result.webp",
  "rice 1kg": "rice1kg_result_result.webp",
  "shampoo 250ml": "Shampoo 250ml_result_result.webp",
  "soda 300ml": "sodaml_result_result.webp",
  "sugar 1kg": "Sugar1kg_result_result.webp",
  "toilet paper (4 roll)": "Toilet paper (4 roll)_result_result.webp",
  "toothpaste 100ml": "Toothpaste 100ml_result_result.webp",
};

const normalizeProductName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export function productImagePath(name: string, fallback: string | null = null): string | null {
  const filename = PRODUCT_IMAGE_BY_NAME[normalizeProductName(name)];
  if (fallback) return fallback;
  return filename ? `/assets/POS/${encodeURIComponent(filename).replace(/%2F/g, "/")}` : null;
}
