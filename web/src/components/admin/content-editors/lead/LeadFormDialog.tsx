import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { Lead, LeadSource, LeadStatus } from '@/types/payload-types';
import { PlatformUser } from '@/services/userService';
import { LeadUpdateInput } from '@/services/leadService';
import {
  EDITABLE_LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
} from '@/lib/leads';

interface LeadFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** The lead being edited; omit to create a new one. */
  lead?: Lead | null;
  users: PlatformUser[];
  /** Create sends the full form; edit sends only the editable fields. */
  onSave: (input: LeadUpdateInput) => void;
  isSaving: boolean;
}

interface FormState {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  source: LeadSource;
  service_interest: string;
  status: LeadStatus;
  lost_reason: string;
  assigned_to: string;
  estimated_system_size: string;
  estimated_value: string;
  next_follow_up: string;
  message: string;
  notes: string;
}

const buildInitialState = (lead?: Lead | null): FormState => ({
  name: lead?.name ?? '',
  company: lead?.company ?? '',
  phone: lead?.phone ?? '',
  email: lead?.email ?? '',
  address: lead?.address ?? '',
  source: lead?.source ?? 'phone',
  service_interest: lead?.service_interest ?? '',
  status: lead?.status ?? 'new',
  lost_reason: lead?.lost_reason ?? '',
  assigned_to: lead?.assigned_to ?? '',
  estimated_system_size: lead?.estimated_system_size?.toString() ?? '',
  estimated_value: lead?.estimated_value?.toString() ?? '',
  // <input type="date"> wants YYYY-MM-DD.
  next_follow_up: lead?.next_follow_up ? lead.next_follow_up.slice(0, 10) : '',
  message: lead?.message ?? '',
  notes: lead?.notes ?? '',
});

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

const LeadFormDialog: React.FC<LeadFormDialogProps> = ({ isOpen, setIsOpen, lead, users, onSave, isSaving }) => {
  const isEdit = !!lead;
  const isConverted = !!lead?.converted_client_id;
  const [form, setForm] = useState<FormState>(buildInitialState(lead));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(lead));
      setErrors({});
    }
  }, [isOpen, lead]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!form.phone.trim() && !form.email.trim()) next.phone = 'Provide a phone number or an email.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    for (const key of ['estimated_system_size', 'estimated_value'] as const) {
      const n = toNumberOrNull(form[key]);
      if (n !== null && (!Number.isFinite(n) || n < 0)) next[key] = 'Must be a non-negative number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const input: LeadUpdateInput = {
      name: form.name,
      company: form.company,
      phone: form.phone,
      email: form.email,
      address: form.address,
      source: form.source,
      service_interest: form.service_interest,
      assigned_to: form.assigned_to || null,
      estimated_system_size: toNumberOrNull(form.estimated_system_size),
      estimated_value: toNumberOrNull(form.estimated_value),
      next_follow_up: form.next_follow_up || null,
      message: form.message,
      notes: form.notes,
    };
    if (isEdit && !isConverted) {
      input.status = form.status;
      input.lost_reason = form.status === 'lost' ? form.lost_reason : '';
    }
    onSave(input);
  };

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.$id, label: u.name || u.email, keywords: u.email })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Lead ${lead?.lead_code}` : 'Add Lead'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update contact details, pipeline stage, and follow-up plans.'
              : 'Register an enquiry received by phone, referral, walk-in, or another channel.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">Name *</Label>
              <Input id="lead-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={255} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <Input id="lead-company" value={form.company} onChange={(e) => set('company', e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+94 XX XXX XXXX" maxLength={50} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={255} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v as LeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service Interest</Label>
              <Select value={form.service_interest || 'none'} onValueChange={(v) => set('service_interest', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {/* Keep a legacy/free-text value selectable when editing. */}
                  {form.service_interest && !SERVICE_INTEREST_OPTIONS.includes(form.service_interest) && (
                    <SelectItem value={form.service_interest}>{form.service_interest}</SelectItem>
                  )}
                  {SERVICE_INTEREST_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v as LeadStatus)} disabled={isConverted}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isConverted && <SelectItem value="won">Won</SelectItem>}
                    {EDITABLE_LEAD_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isConverted && <p className="text-xs text-muted-foreground">Converted leads stay marked as won.</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="lead-assignee">Assigned To</Label>
              <Combobox
                id="lead-assignee"
                modal
                value={form.assigned_to}
                onChange={(v) => set('assigned_to', v)}
                options={assigneeOptions}
                placeholder="Unassigned"
                searchPlaceholder="Search team members..."
                emptyText="No team members found."
              />
            </div>

            {isEdit && form.status === 'lost' && !isConverted && (
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="lead-lost-reason">Lost Reason</Label>
                <Input id="lead-lost-reason" value={form.lost_reason} onChange={(e) => set('lost_reason', e.target.value)} maxLength={1000} placeholder="e.g. Chose a competitor, budget, timing" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="lead-size">Est. System Size (kW)</Label>
              <Input id="lead-size" type="number" min="0" step="any" value={form.estimated_system_size} onChange={(e) => set('estimated_system_size', e.target.value)} />
              {errors.estimated_system_size && <p className="text-xs text-destructive">{errors.estimated_system_size}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-value">Est. Value (LKR)</Label>
              <Input id="lead-value" type="number" min="0" step="any" value={form.estimated_value} onChange={(e) => set('estimated_value', e.target.value)} />
              {errors.estimated_value && <p className="text-xs text-destructive">{errors.estimated_value}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-follow-up">Next Follow-up</Label>
              <Input id="lead-follow-up" type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lead-address">Address</Label>
              <Input id="lead-address" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={1000} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lead-message">Enquiry</Label>
              <Textarea id="lead-message" rows={3} value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={5000} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lead-notes">Internal Notes</Label>
              <Textarea id="lead-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={5000} placeholder="Call outcomes, site details, next steps..." />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
