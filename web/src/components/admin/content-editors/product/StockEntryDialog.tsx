import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Product } from '@/types/payload-types';
import { StockEntryInput } from '@/services/productService';

interface StockEntryDialogProps {
  product: Product | null;
  setOpen: (open: boolean) => void;
  onSave: (input: StockEntryInput) => void;
  isSaving: boolean;
}

type EntryType = StockEntryInput['type'];

const TYPES: Array<{ value: EntryType; label: string; hint: string }> = [
  { value: 'receive', label: 'Receive', hint: 'Stock arriving from a supplier' },
  { value: 'consume', label: 'Consume', hint: 'Stock used on a job or removed' },
  { value: 'adjust', label: 'Adjust', hint: 'Correct a miscount (use a minus sign to reduce)' },
];

const StockEntryDialog: React.FC<StockEntryDialogProps> = ({ product, setOpen, onSave, isSaving }) => {
  const [type, setType] = useState<EntryType>('receive');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setType('receive');
      setQuantity('');
      setNotes('');
      setError('');
    }
  }, [product]);

  if (!product) return null;
  const unit = product.unit || 'pcs';
  const qty = Number(quantity);

  // Preview of the result; the server is the authority and re-checks against live stock.
  const delta = type === 'consume' ? -qty : qty;
  const resulting = Number.isFinite(delta) && quantity !== '' ? product.current_stock + delta : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === '' || !Number.isInteger(qty) || qty === 0) return setError('Enter a whole number greater than zero.');
    if (type !== 'adjust' && qty < 0) return setError('Quantity must be positive.');
    if (type === 'adjust' && !notes.trim()) return setError('Give a reason for the adjustment.');
    if (resulting !== null && resulting < 0) return setError(`Only ${product.current_stock} ${unit} on hand.`);
    onSave({ type, quantity: qty, notes });
  };

  return (
    <Dialog open={!!product} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Entry — {product.sku}</DialogTitle>
          <DialogDescription>
            {product.name} · currently <strong>{product.current_stock} {unit}</strong> on hand
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg border border-border/40">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setType(t.value); setError(''); }}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  type === t.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{TYPES.find((t) => t.value === type)?.hint}</p>

          <div className="space-y-1.5">
            <Label htmlFor="stock-quantity">Quantity ({unit})</Label>
            <Input
              id="stock-quantity"
              type="number"
              step="1"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(''); }}
              autoFocus
            />
            {resulting !== null && (
              <p className={cn('text-xs', resulting < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                Stock after: {resulting} {unit}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock-notes">Notes{type === 'adjust' ? ' *' : ''}</Label>
            <Textarea
              id="stock-notes"
              rows={2}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setError(''); }}
              maxLength={1000}
              placeholder={type === 'receive' ? 'Supplier, invoice no...' : type === 'consume' ? 'Project or site...' : 'Reason for the adjustment'}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Record Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockEntryDialog;
