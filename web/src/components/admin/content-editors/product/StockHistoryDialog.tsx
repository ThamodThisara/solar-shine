import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { cn } from '@/lib/utils';
import { Product } from '@/types/payload-types';
import { fetchStockMovements, MOVEMENT_PAGE_SIZE } from '@/services/productService';
import { STOCK_MOVEMENT_LABELS } from '@/lib/quotations';

interface StockHistoryDialogProps {
  product: Product | null;
  setOpen: (open: boolean) => void;
}

const StockHistoryDialog: React.FC<StockHistoryDialogProps> = ({ product, setOpen }) => {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [product?.$id]);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', product?.$id, page],
    queryFn: () => fetchStockMovements(product!.$id, page),
    enabled: !!product,
  });

  const movements = data?.documents ?? [];
  const total = data?.total ?? 0;

  return (
    <Dialog open={!!product} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock History — {product?.sku}</DialogTitle>
          <DialogDescription>
            {product?.name} · {product?.current_stock} {product?.unit || 'pcs'} on hand
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : movements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No stock movements yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.$id}>
                  <TableCell className="whitespace-nowrap text-sm">{format(new Date(m.$createdAt), 'dd MMM yyyy, HH:mm')}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{STOCK_MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</TableCell>
                  <TableCell className={cn('text-right font-medium', m.quantity < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{m.performed_by_name || '—'}</TableCell>
                  <TableCell className="min-w-[140px] text-sm text-muted-foreground">{m.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <SimplePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / MOVEMENT_PAGE_SIZE))}
          totalItems={total}
          pageSize={MOVEMENT_PAGE_SIZE}
          onPageChange={setPage}
          label="movements"
        />
      </DialogContent>
    </Dialog>
  );
};

export default StockHistoryDialog;
