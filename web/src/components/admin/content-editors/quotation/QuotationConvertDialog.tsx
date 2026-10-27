import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { Quotation } from '@/types/payload-types';
import { ConvertQuotationInput } from '@/services/quotationService';
import { fetchProjectTypes } from '@/services/projectTypeService';
import { formatMoney } from '@/lib/quotations';

interface QuotationConvertDialogProps {
  quotation: Quotation | null;
  setOpen: (open: boolean) => void;
  onConvert: (input: ConvertQuotationInput) => void;
  isConverting: boolean;
}

interface FormState {
  prefix_code: string;
  name: string;
  location: string;
  address: string;
  start_date: string;
  end_date: string;
  system_size: string;
}

const emptyForm = (quotation: Quotation | null): FormState => ({
  prefix_code: '',
  name: quotation ? `${quotation.client_name} — ${quotation.quotation_code}` : '',
  location: '',
  address: quotation?.client_address ?? '',
  start_date: '',
  end_date: '',
  system_size: '',
});

const QuotationConvertDialog: React.FC<QuotationConvertDialogProps> = ({ quotation, setOpen, onConvert, isConverting }) => {
  const [form, setForm] = useState<FormState>(emptyForm(quotation));
  const [error, setError] = useState('');

  useEffect(() => {
    if (quotation) {
      setForm(emptyForm(quotation));
      setError('');
    }
  }, [quotation]);

  const { data: projectTypes = [] } = useQuery({
    queryKey: ['project-types'],
    queryFn: fetchProjectTypes,
    enabled: !!quotation,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prefix_code) return setError('Choose a project type.');
    if (!form.location.trim()) return setError('Enter the project location.');
    if (!form.start_date || !form.end_date) return setError('Enter the start and end dates.');
    if (new Date(form.end_date) < new Date(form.start_date)) return setError('The end date cannot be before the start date.');
    const size = form.system_size.trim() === '' ? 0 : Number(form.system_size);
    if (!Number.isFinite(size) || size < 0) return setError('System size must be zero or more.');

    onConvert({
      prefix_code: form.prefix_code,
      name: form.name,
      location: form.location,
      address: form.address,
      start_date: form.start_date,
      end_date: form.end_date,
      system_size: size,
    });
  };

  return (
    <Dialog open={!!quotation} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
          <DialogDescription>
            {quotation ? `${quotation.quotation_code} · ${quotation.client_name} · contract value ${formatMoney(quotation.grand_total)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Project type *</Label>
              <Select value={form.prefix_code} onValueChange={(v) => set('prefix_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select a project type" /></SelectTrigger>
                <SelectContent>
                  {projectTypes.map((t) => (
                    <SelectItem key={t.$id} value={t.prefix_code}>{t.prefix_code} — {t.service_title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The project ID (e.g. PRO-2026-0001) is assigned automatically.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cv-name">Project name</Label>
              <Input id="cv-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-location">Location *</Label>
              <Input id="cv-location" value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={255} placeholder="Town or district" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-size">System size (kW)</Label>
              <Input id="cv-size" type="number" min="0" step="any" value={form.system_size} onChange={(e) => set('system_size', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-start">Start date *</Label>
              <Input id="cv-start" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv-end">End date *</Label>
              <Input id="cv-end" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cv-address">Site address</Label>
              <Input id="cv-address" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={500} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isConverting}>Cancel</Button>
            <Button type="submit" disabled={isConverting}>
              <Briefcase className="mr-2 h-4 w-4" />
              {isConverting ? 'Creating project...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationConvertDialog;
