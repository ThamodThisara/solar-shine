import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Save, Check, ChevronsUpDown } from 'lucide-react';
import { CreateProjectExecutionInput } from '@/services/projectExecutionService';
import { ProjectExecutionStatus } from '@/types/payload-types';

interface ProjectExecutionFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (input: CreateProjectExecutionInput) => void;
  isSaving: boolean;
}

const statusOptions: Array<{ value: ProjectExecutionStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface FormState {
  name: string;
  client: string;
  location: string;
  status: ProjectExecutionStatus | '';
  system_size: string;
  contract_value: string;
  current_stage: string;
  engineer: string;
  sales_manager: string;
  start_date: string;
  end_date: string;
}

const initialState: FormState = {
  name: '',
  client: '',
  location: '',
  status: '',
  system_size: '',
  contract_value: '',
  current_stage: '',
  engineer: '',
  sales_manager: '',
  start_date: '',
  end_date: '',
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Project name is required.';
  if (!form.client.trim()) errors.client = 'Client is required.';
  if (!form.location.trim()) errors.location = 'Location is required.';

  if (!form.status) errors.status = 'Status is required.';

  if (!form.system_size.trim()) {
    errors.system_size = 'System size is required.';
  } else {
    const size = Number(form.system_size);
    if (Number.isNaN(size)) errors.system_size = 'System size must be a number.';
    else if (size <= 0) errors.system_size = 'System size must be greater than 0.';
  }

  if (!form.contract_value.trim()) {
    errors.contract_value = 'Contract value is required.';
  } else {
    const value = Number(form.contract_value);
    if (Number.isNaN(value)) errors.contract_value = 'Contract value must be a number.';
    else if (value <= 0) errors.contract_value = 'Contract value must be greater than 0.';
  }

  if (!form.start_date) errors.start_date = 'Start date is required.';
  if (!form.end_date) {
    errors.end_date = 'End date is required.';
  } else if (form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
    errors.end_date = 'End date cannot be before the start date.';
  }

  return errors;
};

const ProjectExecutionFormDialog: React.FC<ProjectExecutionFormDialogProps> = ({
  isOpen,
  setIsOpen,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusOpen, setStatusOpen] = useState(false);

  // Reset the form each time the dialog is opened.
  useEffect(() => {
    if (isOpen) {
      setForm(initialState);
      setErrors({});
    }
  }, [isOpen]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave({
      name: form.name.trim(),
      client: form.client.trim(),
      location: form.location.trim(),
      status: form.status as ProjectExecutionStatus,
      engineer: form.engineer.trim() || undefined,
      sales_manager: form.sales_manager.trim() || undefined,
      system_size: Number(form.system_size),
      contract_value: Number(form.contract_value),
      start_date: form.start_date,
      end_date: form.end_date,
      current_stage: form.current_stage.trim() || undefined,
    });
  };

  const errorClass = (key: keyof FormState) =>
    errors[key] ? 'border-red-500 focus-visible:ring-red-500' : '';

  const FieldError: React.FC<{ field: keyof FormState }> = ({ field }) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={errorClass('name')}
                aria-invalid={!!errors.name}
              />
              <FieldError field="name" />
            </div>
            <div>
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={form.client}
                onChange={(e) => setField('client', e.target.value)}
                className={errorClass('client')}
                aria-invalid={!!errors.client}
              />
              <FieldError field="client" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                className={errorClass('location')}
                aria-invalid={!!errors.location}
              />
              <FieldError field="location" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="status"
                    type="button"
                    role="combobox"
                    aria-expanded={statusOpen}
                    aria-invalid={!!errors.status}
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      !form.status && 'text-muted-foreground',
                      errorClass('status')
                    )}
                  >
                    {form.status
                      ? statusOptions.find((s) => s.value === form.status)?.label
                      : 'Select status'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandList>
                      <CommandEmpty>No status found.</CommandEmpty>
                      <CommandGroup>
                        {statusOptions.map((s) => (
                          <CommandItem
                            key={s.value}
                            value={s.label}
                            onSelect={() => {
                              setField('status', s.value);
                              setStatusOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                form.status === s.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {s.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError field="status" />
            </div>
            <div>
              <Label htmlFor="system_size">System Size (kW)</Label>
              <Input
                id="system_size"
                type="number"
                step="0.01"
                min="0"
                value={form.system_size}
                onChange={(e) => setField('system_size', e.target.value)}
                className={errorClass('system_size')}
                aria-invalid={!!errors.system_size}
              />
              <FieldError field="system_size" />
            </div>
            <div>
              <Label htmlFor="contract_value">Contract Value (LKR)</Label>
              <Input
                id="contract_value"
                type="number"
                step="0.01"
                min="0"
                value={form.contract_value}
                onChange={(e) => setField('contract_value', e.target.value)}
                className={errorClass('contract_value')}
                aria-invalid={!!errors.contract_value}
              />
              <FieldError field="contract_value" />
            </div>
            <div>
              <Label htmlFor="current_stage">Current Stage</Label>
              <Input
                id="current_stage"
                value={form.current_stage}
                onChange={(e) => setField('current_stage', e.target.value)}
                placeholder="e.g. Site Survey"
              />
            </div>
            <div>
              <Label htmlFor="engineer">Engineer</Label>
              <Input
                id="engineer"
                value={form.engineer}
                onChange={(e) => setField('engineer', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sales_manager">Sales Manager</Label>
              <Input
                id="sales_manager"
                value={form.sales_manager}
                onChange={(e) => setField('sales_manager', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                className={errorClass('start_date')}
                aria-invalid={!!errors.start_date}
              />
              <FieldError field="start_date" />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
                className={errorClass('end_date')}
                aria-invalid={!!errors.end_date}
              />
              <FieldError field="end_date" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectExecutionFormDialog;
