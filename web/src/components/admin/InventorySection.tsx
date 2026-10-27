import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, PackagePlus, History, Archive, ArchiveRestore, Search, Package, Terminal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/quotations';
import { Product } from '@/types/payload-types';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  recordStockEntry,
  PRODUCT_PAGE_SIZE,
  CreateProductInput,
  StockEntryInput,
} from '@/services/productService';
import ProductFormDialog from './content-editors/product/ProductFormDialog';
import StockEntryDialog from './content-editors/product/StockEntryDialog';
import StockHistoryDialog from './content-editors/product/StockHistoryDialog';

const stockState = (p: Product): { label: string; className: string } => {
  if (p.current_stock <= 0) return { label: 'Out of stock', className: 'bg-red-100 text-red-800' };
  if (p.reorder_level != null && p.current_stock <= p.reorder_level) return { label: 'Low stock', className: 'bg-amber-100 text-amber-800' };
  return { label: 'In stock', className: 'bg-emerald-100 text-emerald-800' };
};

const InventorySection: React.FC = () => {
  const { isLoading: isAuthLoading, hasPermission } = useAuth();
  const canAccess = hasPermission('inventory:view');
  const canManage = hasPermission('inventory:manage');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, includeInactive, page],
    queryFn: () => fetchProducts({ page, search: debouncedSearch, includeInactive }),
    enabled: canAccess,
    meta: { onError: (error: Error) => toast.error(`Failed to load products: ${error.message}`) },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['active-products'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const saveMutation = useMutation({
    mutationFn: (input: CreateProductInput) =>
      editingProduct ? updateProduct(editingProduct.$id, input) : createProduct(input),
    onSuccess: (product) => {
      invalidate();
      toast.success(editingProduct ? 'Product updated' : `${product.name} added`);
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save product'),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: StockEntryInput }) => recordStockEntry(id, input),
    onSuccess: (product) => {
      invalidate();
      toast.success(`Stock updated — ${product.current_stock} ${product.unit || 'pcs'} on hand`);
      setStockProduct(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to record stock entry'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ product, active }: { product: Product; active: boolean }) =>
      active ? updateProduct(product.$id, { is_active: true }) : deactivateProduct(product.$id),
    onSuccess: (_, { active }) => {
      invalidate();
      toast.success(active ? 'Product reactivated' : 'Product deactivated');
      setDeactivating(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update product'),
  });

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>Please contact an administrator if you believe this is an error.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const products = data?.documents ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Product catalog and stock on hand. Stock changes are recorded as entries so there is always a history.</CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          )}
        </CardHeader>
      </Card>

      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex-1 md:max-w-sm space-y-1.5">
          <Label htmlFor="product-search" className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="product-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Product name or SKU"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 h-10">
          <Switch id="show-inactive" checked={includeInactive} onCheckedChange={(v) => { setIncludeInactive(v); setPage(0); }} />
          <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {debouncedSearch ? 'No products match this search.' : 'No products yet. Add your first product to start tracking stock.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const state = stockState(p);
                return (
                  <TableRow key={p.$id} className={cn(!p.is_active && 'opacity-60')}>
                    <TableCell className="min-w-[200px]">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku}{p.brand ? ` · ${p.brand}` : ''}{p.model ? ` ${p.model}` : ''}{!p.is_active ? ' · Inactive' : ''}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.category || '—'}</TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(p.unit_price)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium mr-2">{p.current_stock} {p.unit || 'pcs'}</span>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', state.className)}>{state.label}</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Stock history" aria-label={`Stock history for ${p.sku}`} onClick={() => setHistoryProduct(p)}>
                        <History className="h-4 w-4" />
                      </Button>
                      {canManage && p.is_active && (
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-emerald-700 hover:text-emerald-800" title="Record stock entry" aria-label={`Record stock for ${p.sku}`} onClick={() => setStockProduct(p)}>
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Edit product" aria-label={`Edit ${p.sku}`} onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        p.is_active ? (
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-600 hover:text-red-700" title="Deactivate" aria-label={`Deactivate ${p.sku}`} onClick={() => setDeactivating(p)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Reactivate" aria-label={`Reactivate ${p.sku}`} onClick={() => statusMutation.mutate({ product: p, active: true })}>
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <SimplePagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE))}
        totalItems={total}
        pageSize={PRODUCT_PAGE_SIZE}
        onPageChange={setPage}
        label="products"
      />

      <ProductFormDialog
        isOpen={isFormOpen}
        setIsOpen={(open) => { if (!open) closeForm(); }}
        product={editingProduct}
        onSave={(input) => saveMutation.mutate(input)}
        isSaving={saveMutation.isPending}
      />

      <StockEntryDialog
        product={stockProduct}
        setOpen={(open) => { if (!open) setStockProduct(null); }}
        onSave={(input) => stockProduct && stockMutation.mutate({ id: stockProduct.$id, input })}
        isSaving={stockMutation.isPending}
      />

      <StockHistoryDialog product={historyProduct} setOpen={(open) => { if (!open) setHistoryProduct(null); }} />

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => { if (!open) setDeactivating(null); }}
        title="Deactivate product?"
        description={deactivating ? `"${deactivating.name}" will no longer be offered on new quotations. Its stock history and existing quotations are kept, and you can reactivate it later.` : ''}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="destructive"
        isLoading={statusMutation.isPending}
        onConfirm={() => deactivating && statusMutation.mutate({ product: deactivating, active: false })}
      />
    </div>
  );
};

export default InventorySection;
