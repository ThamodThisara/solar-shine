import { ID } from 'node-appwrite';
import { HttpError, requirePermission } from '../lib/rbac.js';
import { str, nonNegativeNumber, oneOf, ValidationError } from '../lib/validate.js';
import { runTransaction, isUniqueViolation, isLimitExceeded } from '../lib/tx.js';

/**
 * Product catalog and stock routes. `products` and `stock_movements` are
 * read-only from the frontend, so every write goes through here.
 *
 *   POST   /products/create       inventory:manage   Create a product (+ opening stock)
 *   PUT    /products/:id          inventory:manage   Update catalog fields (never stock)
 *   DELETE /products/:id          inventory:manage   Soft-delete (is_active = false)
 *   POST   /products/:id/stock    inventory:manage   Receive / consume / adjust stock
 *
 * `current_stock` only ever changes through /stock, inside a transaction that
 * also writes the `stock_movements` ledger row — so the ledger always sums to
 * the stock on hand.
 */

const PRODUCTS = 'products';
const MOVEMENTS = 'stock_movements';

const MOVEMENT_TYPES = ['receive', 'consume', 'adjust'];
const MAX_STOCK_QUANTITY = 1_000_000;

/** Whole-number quantity, optionally allowing negatives (for adjustments). */
function parseQuantity(value, field, { allowNegative = false } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${field} must be a whole number`);
  if (Math.abs(n) > MAX_STOCK_QUANTITY) throw new ValidationError(`${field} is too large`);
  if (!allowNegative && n < 0) throw new ValidationError(`${field} cannot be negative`);
  return n;
}

function parseCatalogFields(body, { partial = false } = {}) {
  const fields = {
    sku: () => str(body.sku, 'SKU', { max: 50, required: true }),
    name: () => str(body.name, 'Name', { max: 255, required: true }),
    category: () => str(body.category, 'Category', { max: 100 }),
    brand: () => str(body.brand, 'Brand', { max: 100 }),
    model: () => str(body.model, 'Model', { max: 100 }),
    unit: () => str(body.unit, 'Unit', { max: 20 }) ?? 'pcs',
    unit_price: () => nonNegativeNumber(body.unit_price, 'Unit price') ?? 0,
    cost_price: () => nonNegativeNumber(body.cost_price, 'Cost price'),
    reorder_level: () => (body.reorder_level === '' || body.reorder_level == null
      ? null
      : parseQuantity(body.reorder_level, 'Reorder level')),
    description: () => str(body.description, 'Description', { max: 2000 }),
  };

  const data = {};
  for (const [key, parse] of Object.entries(fields)) {
    if (partial && !(key in body)) continue;
    data[key] = parse();
  }
  if (data.sku) data.sku = data.sku.toUpperCase();
  return data;
}

async function getProductOr404(ctx, productId) {
  try {
    return await ctx.tdb.getRow(ctx.databaseId, PRODUCTS, productId);
  } catch (e) {
    if (e.code === 404) throw new HttpError(404, 'Product not found');
    throw e;
  }
}

async function movementActor(ctx) {
  const caller = await ctx.getCaller();
  return { performed_by: caller.$id, performed_by_name: caller.name || caller.email };
}

async function handleCreate(ctx, body) {
  requirePermission(ctx.can, 'inventory:manage');
  if ('current_stock' in body) {
    throw new HttpError(400, 'Use "opening_stock" when creating a product');
  }
  const data = parseCatalogFields(body);
  const openingStock = body.opening_stock ? parseQuantity(body.opening_stock, 'Opening stock') : 0;
  const actor = await movementActor(ctx);
  const productId = ID.unique();

  try {
    await runTransaction(ctx.tdb, async (tx) => {
      await ctx.tdb.createRow(ctx.databaseId, PRODUCTS, productId, {
        ...data,
        current_stock: openingStock,
        is_active: true,
      }, undefined, tx);
      if (openingStock > 0) {
        await ctx.tdb.createRow(ctx.databaseId, MOVEMENTS, ID.unique(), {
          product_id: productId,
          movement_type: 'opening',
          quantity: openingStock,
          reference_type: 'manual',
          notes: 'Opening stock',
          ...actor,
        }, undefined, tx);
      }
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, `A product with SKU "${data.sku}" already exists`);
    throw e;
  }

  return { status: 200, body: await ctx.tdb.getRow(ctx.databaseId, PRODUCTS, productId) };
}

async function handleUpdate(ctx, productId, body) {
  requirePermission(ctx.can, 'inventory:manage');
  if ('current_stock' in body) {
    throw new HttpError(400, 'Stock cannot be edited directly — record a stock entry instead');
  }
  await getProductOr404(ctx, productId);
  const data = parseCatalogFields(body, { partial: true });
  if ('is_active' in body) data.is_active = body.is_active === true;

  try {
    const updated = await ctx.tdb.updateRow(ctx.databaseId, PRODUCTS, productId, data);
    return { status: 200, body: updated };
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'A product with this SKU already exists');
    throw e;
  }
}

async function handleDelete(ctx, productId) {
  requirePermission(ctx.can, 'inventory:manage');
  await getProductOr404(ctx, productId);
  // Soft delete: quotations and the stock ledger keep referencing the product.
  const updated = await ctx.tdb.updateRow(ctx.databaseId, PRODUCTS, productId, { is_active: false });
  return { status: 200, body: updated };
}

async function handleStockEntry(ctx, productId, body) {
  requirePermission(ctx.can, 'inventory:manage');
  const type = oneOf(body.type, 'Type', MOVEMENT_TYPES);
  if (!type) throw new ValidationError('Type is required');

  const quantity = parseQuantity(body.quantity, 'Quantity', { allowNegative: type === 'adjust' });
  if (quantity === 0) throw new ValidationError('Quantity cannot be zero');
  if (type !== 'adjust' && quantity < 0) throw new ValidationError('Quantity must be positive');

  const notes = str(body.notes, 'Notes', { max: 1000, required: type === 'adjust' });
  const product = await getProductOr404(ctx, productId);
  if (!product.is_active) throw new HttpError(400, 'This product is inactive');

  // receive: +qty, consume: -qty, adjust: signed as entered.
  const delta = type === 'consume' ? -quantity : quantity;
  const actor = await movementActor(ctx);

  try {
    await runTransaction(ctx.tdb, async (tx) => {
      if (delta > 0) {
        await ctx.tdb.incrementRowColumn(ctx.databaseId, PRODUCTS, productId, 'current_stock', delta, undefined, tx);
      } else {
        // Staged decrements below `min` are accepted here and rejected at commit.
        await ctx.tdb.decrementRowColumn(ctx.databaseId, PRODUCTS, productId, 'current_stock', -delta, 0, tx);
      }
      await ctx.tdb.createRow(ctx.databaseId, MOVEMENTS, ID.unique(), {
        product_id: productId,
        movement_type: type,
        quantity: delta,
        reference_type: 'manual',
        notes,
        ...actor,
      }, undefined, tx);
    });
  } catch (e) {
    if (isLimitExceeded(e)) {
      throw new HttpError(400, `Insufficient stock: only ${product.current_stock} ${product.unit || 'pcs'} on hand`);
    }
    throw e;
  }

  return { status: 200, body: await ctx.tdb.getRow(ctx.databaseId, PRODUCTS, productId) };
}

/** Dispatches an authenticated `/products/*` request, or returns null when not a product route. */
export async function handleProductRoute(ctx) {
  const { method, path, body } = ctx;

  if (method === 'POST' && path === '/products/create') return handleCreate(ctx, body);

  let match = path.match(/^\/products\/([^/]+)\/stock$/);
  if (method === 'POST' && match) return handleStockEntry(ctx, match[1], body);

  match = path.match(/^\/products\/([^/]+)$/);
  if (match && method === 'PUT') return handleUpdate(ctx, match[1], body);
  if (match && method === 'DELETE') return handleDelete(ctx, match[1]);

  return null;
}
