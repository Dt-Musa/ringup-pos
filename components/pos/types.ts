export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  categoryId: string;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
};
export type PosCategory = { id: string; name: string };
