export type CategoryOption = { id: string; name: string; productCount?: number };

export type ProductRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  image: string | null;
  categoryId: string;
  categoryName: string;
  buyingCost: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  active: boolean;
};
