import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Product } from '@/types/payload-types';
import { ClientRecord } from '@/services/clientService';
import { QuotationInput, QuotationWithItems } from '@/services/quotationService';
import { DEFAULT_VALIDITY_DAYS, MAX_QUOTATION_ITEMS, formatMoney, previewTotals } from '@/lib/quotations';

interface QuotationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** The quotation being edited (with its items); omit to create a new one. */
  quotation?: QuotationWithItems | null;
  /** Starting values for a new quotation, e.g. from a lead. */
  prefill?: Partial<QuotationInput> | null;
  products: Product[];
  clients: ClientRecord[];
  onSave: (input: QuotationInput) => void;
  isSaving: boolean;
}

interface LineState {
  key: number;
  product_id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  discount: string;
}

interface FormState {
  client_id: string;
  lead_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  valid_until: string;
  tax_rate: string;
  notes: string;
  terms: string;
  lines: LineState[];
}

let lineKey = 0;
const emptyLine = (): LineState => ({ key: ++lineKey, product_id: '', description: '', quantity: '1', unit: '', unit_price: '', discount: '' });

const dateInputValue = (d: Date) => d.toISOString().slice(0, 10);
const defaultValidUntil = () => dateInputValue(new Date(Date.now() + DEFAULT_VALIDITY_DAYS * 86_400_000));

function buildInitialState(quotation?: QuotationWithItems | null, prefill?: Partial<QuotationInput> | null): FormState {
  if (quotation) {
    return {
      client_id: quotation.client_id ?? '',
      lead_id: quotation.lead_id ?? '',
      client_name: quotation.client_name,
      client_email: quotation.client_email ?? '',
      client_phone: quotation.client_phone ?? '',
      client_address: quotation.client_address ?? '',
      valid_until: quotation.valid_until ? quotation.valid_until.slice(0, 10) : defaultValidUntil(),
      tax_rate: String(quotation.tax_rate ?? 0),
      notes: quotation.notes ?? '',
      terms: quotation.terms ?? '',
      lines: quotation.items.map((i) => ({
        key: ++lineKey,
        product_id: i.product_id ?? '',
        description: i.description,
        quantity: String(i.quantity),
        unit: i.unit ?? '',
        unit_price: String(i.unit_price),
        discount: i.discount ? String(i.discount) : '',
      })),
    };
  }
  return {
    client_id: prefill?.client_id ?? '',
    lead_id: prefill?.lead_id ?? '',
    client_name: prefill?.client_name ?? '',
    client_email: prefill?.client_email ?? '',
    client_phone: prefill?.client_phone ?? '',
    client_address: prefill?.client_address ?? '',
    valid_until: defaultValidUntil(),
    tax_rate: '0',
    notes: '',
    terms: '',
    lines: [emptyLine()],
  };
}

const num = (value: string) => (value.trim() === '' ? 0 : Number(value));

const QuotationFormDialog: React.FC<QuotationFormDialogProps> = ({
  isOpen, setIsOpen, quotation, prefill, products, clients, onSave, isSaving,
}) => {
  const isEdit = !!quotation;
  const [form, setForm] = useState<FormState>(() => buildInitialState(quotation, prefill));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(quotation, prefill));
      setError('');
    }
  }, [isOpen, quotation, prefill]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const setLine = (key: number, patch: Partial<LineState>) => {
    setForm((prev) => ({ ...prev, lines: prev.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
    setError('');
  };

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Custom item' },
      ...products.map((p) => ({ value: p.$id, label: `${p.sku} — ${p.name}`, keywords: `${p.brand ?? ''} ${p.model ?? ''} ${p.category ?? ''}` })),
    ],
    [products]
  );
  const clientOptions = useMemo(
    () => [
      { value: '', label: 'No registered client' },
      ...clients.filter((c) => c.$id).map((c) => ({ value: c.$id!, label: `${c.clientCode ? `${c.clientCode} — ` : ''}${c.name}`, keywords: `${c.email} ${c.phone}` })),
    ],
    [clients]
  );

  const pickClient = (clientId: string) => {
    const c = clients.find((x) => x.$id === clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      ...(c ? { client_name: c.name, client_email: c.email ?? '', client_phone: c.phone ?? '', client_address: c.address ?? '' } : {}),
    }));
    setError('');
  };

  const pickProduct = (lineId: number, productId: string) => {
    const p = products.find((x) => x.$id === productId);
    setLine(lineId, p
      ? { product_id: productId, description: p.name, unit: p.unit ?? '', unit_price: String(p.unit_price ?? 0) }
      : { product_id: '' });
  };

  const taxRate = num(form.tax_rate);
  const totals = previewTotals(
    form.lines.map((l) => ({ quantity: num(l.quantity), unit_price: num(l.unit_price), discount: num(l.discount) })),
    taxRate
  );

  const validate = (): string => {
    if (!form.client_name.trim()) return 'Enter the customer name.';
    if (form.client_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email.trim())) return 'Enter a valid customer email.';
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return 'Tax rate must be between 0 and 100.';
    if (form.lines.length === 0) return 'Add at least one line item.';
    for (const [i, l] of form.lines.entries()) {
      const n = i + 1;
      if (!l.description.trim()) return `Item ${n}: add a description.`;
      if (!(num(l.quantity) > 0)) return `Item ${n}: quantity must be greater than zero.`;
      if (!(num(l.unit_price) >= 0) || l.unit_price.trim() === '') return `Item ${n}: enter a unit price.`;
      if (num(l.discount) < 0 || num(l.discount) > num(l.quantity) * num(l.unit_price)) return `Item ${n}: discount cannot exceed the line amount.`;
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    onSave({
      client_id: form.client_id || null,
      lead_id: form.lead_id || null,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      client_address: form.client_address,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      tax_rate: taxRate,
      notes: form.notes,
      terms: form.terms,
      items: form.lines.map((l) => ({
        product_id: l.product_id || null,
        description: l.description,
        quantity: num(l.quantity),
        unit: l.unit,
        unit_price: num(l.unit_price),
        discount: num(l.discount),
      })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${quotation?.quotation_code}` : 'New Quotation'}</DialogTitle>
          <DialogDescription>
            Totals shown here are a preview — they are recalculated on the server when you save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="q-client">Registered client (optional)</Label>
              <Combobox
                id="q-client"
                modal
                value={form.client_id}
                onChange={pickClient}
                options={clientOptions}
                placeholder="Pick a client to fill in their details"
                searchPlaceholder="Search clients..."
                emptyText="No clients found."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-name">Customer name *</Label>
              <Input id="q-name" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-email">Email</Label>
              <Input id="q-email" type="email" value={form.client_email} onChange={(e) => set('client_email', e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-phone">Phone</Label>
              <Input id="q-phone" value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-address">Address</Label>
              <Input id="q-address" value={form.client_address} onChange={(e) => set('client_address', e.target.value)} maxLength={1000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-valid">Valid until</Label>
              <Input id="q-valid" type="date" value={form.valid_until} onChange={(e) => set('valid_until', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-tax">Tax rate (%)</Label>
              <Input id="q-tax" type="number" min="0" max="100" step="any" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={form.lines.length >= MAX_QUOTATION_ITEMS}
                onClick={() => set('lines', [...form.lines, emptyLine()])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add item
              </Button>
            </div>

            {form.lines.map((line, index) => {
              const lineTotal = num(line.quantity) * num(line.unit_price) - num(line.discount);
              return (
                <div key={line.key} className="rounded-lg border p-3 space-y-3 bg-muted/20">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Item {index + 1} — product</Label>
                      <Combobox
                        modal
                        value={line.product_id}
                        onChange={(v) => pickProduct(line.key, v)}
                        options={productOptions}
                        placeholder="Custom item"
                        searchPlaceholder="Search products..."
                        emptyText="No products found."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-6 h-9 w-9 p-0 text-red-600 hover:text-red-700 shrink-0"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={form.lines.length === 1}
                      onClick={() => set('lines', form.lines.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
                    <div className="col-span-2 md:col-span-5 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Description *</Label>
                      <Input value={line.description} onChange={(e) => setLine(line.key, { description: e.target.value })} maxLength={1000} />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Qty *</Label>
                      <Input type="number" min="0" step="any" value={line.quantity} onChange={(e) => setLine(line.key, { quantity: e.target.value })} />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Unit</Label>
                      <Input value={line.unit} onChange={(e) => setLine(line.key, { unit: e.target.value })} maxLength={20} />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Unit price *</Label>
                      <Input type="number" min="0" step="any" value={line.unit_price} onChange={(e) => setLine(line.key, { unit_price: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Discount</Label>
                      <Input type="number" min="0" step="any" value={line.discount} onChange={(e) => setLine(line.key, { discount: e.target.value })} />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1.5 md:text-right">
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="h-10 flex items-center md:justify-end text-sm font-medium">
                        {Number.isFinite(lineTotal) ? lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="ml-auto w-full sm:max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              {totals.discount_total > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(totals.discount_total)}</span></div>
              )}
              {totals.tax_total > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{formatMoney(totals.tax_total)}</span></div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{formatMoney(totals.grand_total)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-notes">Notes (shown to the customer)</Label>
              <Textarea id="q-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={5000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-terms">Terms & conditions</Label>
              <Textarea id="q-terms" rows={3} value={form.terms} onChange={(e) => set('terms', e.target.value)} maxLength={5000} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Quotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
