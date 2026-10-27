import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { Product } from '@/types/payload-types';
import { CreateProductInput } from '@/services/productService';

interface ProductFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** The product being edited; omit to create a new one. */
  product?: Product | null;
  /** Create sends opening_stock too; edit omits it (stock changes via stock entries only). */
  onSave: (input: CreateProductInput) => void;
  isSaving: boolean;
}

interface FormState {
  sku: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  unit: string;
  unit_price: string;
  cost_price: string;
  reorder_level: string;
  opening_stock: string;
  description: string;
}

const buildInitialState = (p?: Product | null): FormState => ({
  sku: p?.sku ?? '',
  name: p?.name ?? '',
  category: p?.category ?? '',
  brand: p?.brand ?? '',
  model: p?.model ?? '',
  unit: p?.unit ?? 'pcs',
  unit_price: p?.unit_price?.toString() ?? '',
  cost_price: p?.cost_price?.toString() ?? '',
  reorder_level: p?.reorder_level?.toString() ?? '',
  opening_stock: '',
  description: p?.description ?? '',
});

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

const ProductFormDialog: React.FC<ProductFormDialogProps> = ({ isOpen, setIsOpen, product, onSave, isSaving }) => {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(buildInitialState(product));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(product));
      setErrors({});
    }
  }, [isOpen, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.sku.trim()) next.sku = 'SKU is required.';
    if (!form.name.trim()) next.name = 'Name is required.';
    for (const key of ['unit_price', 'cost_price'] as const) {
      const n = toNumberOrNull(form[key]);
      if (n !== null && (!Number.isFinite(n) || n < 0)) next[key] = 'Must be a non-negative number.';
    }
    for (const key of ['reorder_level', 'opening_stock'] as const) {
      const n = toNumberOrNull(form[key]);
      if (n !== null && (!Number.isInteger(n) || n < 0)) next[key] = 'Must be a whole number, zero or more.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const input: CreateProductInput = {
      sku: form.sku,
      name: form.name,
      category: form.category,
      brand: form.brand,
      model: form.model,
      unit: form.unit,
      unit_price: toNumberOrNull(form.unit_price),
      cost_price: toNumberOrNull(form.cost_price),
      reorder_level: toNumberOrNull(form.reorder_level),
      description: form.description,
    };
    if (!isEdit) input.opening_stock = toNumberOrNull(form.opening_stock) ?? 0;
    onSave(input);
  };

  const field = (
    key: keyof FormState,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`product-${key}`}>{label}</Label>
      <Input id={`product-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${product?.sku}` : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update catalog details. Stock quantity is changed by recording a stock entry.'
              : 'Add an item to the catalog. Opening stock is recorded in the stock history.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('sku', 'SKU *', { maxLength: 50, placeholder: 'e.g. PV-550' })}
            {field('name', 'Name *', { maxLength: 255 })}
            {field('category', 'Category', { maxLength: 100, placeholder: 'e.g. Panels, Inverters' })}
            {field('brand', 'Brand', { maxLength: 100 })}
            {field('model', 'Model', { maxLength: 100 })}
            {field('unit', 'Unit', { maxLength: 20, placeholder: 'pcs, m, set' })}
            {field('unit_price', 'Selling Price (LKR)', { type: 'number', min: '0', step: 'any' })}
            {field('cost_price', 'Cost Price (LKR)', { type: 'number', min: '0', step: 'any' })}
            {field('reorder_level', 'Reorder Level', { type: 'number', min: '0', step: '1', placeholder: 'Warn at or below' })}
            {!isEdit && field('opening_stock', 'Opening Stock', { type: 'number', min: '0', step: '1' })}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea id="product-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
