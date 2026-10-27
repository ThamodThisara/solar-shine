import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ExecutionMethod, Query } from 'appwrite';
import { callTeamFunction } from './teamService';
import { Product, StockMovement, StockMovementType } from '@/types/payload-types';

/**
 * Products and stock are read directly but are read-only to users: every
 * create/update/stock entry goes through the team-management function, which
 * validates input, enforces `inventory:manage`, and keeps stock and the movement
 * ledger consistent in one transaction.
 */

export const PRODUCT_PAGE_SIZE = 10;
export const MOVEMENT_PAGE_SIZE = 8;

export interface ProductListParams {
  page?: number;
  search?: string;
  includeInactive?: boolean;
}

export interface ProductListResult {
  documents: Product[];
  total: number;
}

export async function fetchProducts(
  { page = 0, search = '', includeInactive = false }: ProductListParams = {}
): Promise<ProductListResult> {
  const queries = [
    Query.orderAsc('name'),
    Query.limit(PRODUCT_PAGE_SIZE),
    Query.offset(page * PRODUCT_PAGE_SIZE),
  ];
  if (!includeInactive) queries.push(Query.equal('is_active', true));

  const term = search.trim();
  if (term) {
    queries.push(Query.or([Query.search('name', term), Query.startsWith('sku', term.toUpperCase())]));
  }

  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, queries);
  return { documents: response.documents as unknown as Product[], total: response.total };
}

/** Every active product, for pickers (e.g. quotation line items). Pages through the collection. */
export async function fetchActiveProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let cursor: string | undefined;
  for (;;) {
    const queries = [Query.equal('is_active', true), Query.orderAsc('$id'), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, queries);
    products.push(...(response.documents as unknown as Product[]));
    if (response.documents.length < 100) break;
    cursor = response.documents[response.documents.length - 1].$id;
  }
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export interface ProductInput {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  unit?: string;
  unit_price?: number | null;
  cost_price?: number | null;
  reorder_level?: number | null;
  description?: string;
}

export interface CreateProductInput extends ProductInput {
  /** Initial quantity on hand; recorded as an "opening" stock movement. */
  opening_stock?: number;
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return callTeamFunction<Product>('/products/create', ExecutionMethod.POST, input);
}

export function updateProduct(
  productId: string,
  input: Partial<ProductInput> & { is_active?: boolean }
): Promise<Product> {
  return callTeamFunction<Product>(`/products/${productId}`, ExecutionMethod.PUT, input);
}

/** Soft delete — quotations and the stock ledger keep referencing the product. */
export function deactivateProduct(productId: string): Promise<Product> {
  return callTeamFunction<Product>(`/products/${productId}`, ExecutionMethod.DELETE);
}

export interface StockEntryInput {
  type: Exclude<StockMovementType, 'opening'>;
  /** Positive for receive/consume; signed for adjust. */
  quantity: number;
  notes?: string;
}

export function recordStockEntry(productId: string, input: StockEntryInput): Promise<Product> {
  return callTeamFunction<Product>(`/products/${productId}/stock`, ExecutionMethod.POST, input);
}

export interface MovementListResult {
  documents: StockMovement[];
  total: number;
}

export async function fetchStockMovements(productId: string, page = 0): Promise<MovementListResult> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.STOCK_MOVEMENTS, [
    Query.equal('product_id', productId),
    Query.orderDesc('$createdAt'),
    Query.limit(MOVEMENT_PAGE_SIZE),
    Query.offset(page * MOVEMENT_PAGE_SIZE),
  ]);
  return { documents: response.documents as unknown as StockMovement[], total: response.total };
}
