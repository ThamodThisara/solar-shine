import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Save, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { CreateProjectExecutionInput } from '@/services/projectExecutionService';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';
import { MultiSelectPopover } from '@/components/ui/multi-select-popover';
import { Combobox } from '@/components/ui/combobox';
import { fetchClients, registerClient, ClientRecord } from '@/services/clientService';
import { fetchUsers, fetchEngineers, PlatformUser } from '@/services/userService';
import { toast } from 'sonner';
import { MapPicker } from '@/components/ui/map-picker';
import { Checkbox } from '@/components/ui/checkbox';

interface ProjectExecutionFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (input: CreateProjectExecutionInput) => void;
  isSaving: boolean;
  project?: ProjectExecution;
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
  address: string;
  google_maps_link: string;
  status: ProjectExecutionStatus | '';
  system_size: string;
  contract_value: string;
  current_stage: string;
  engineer: string;
  planning_engineer: string;
  sales_manager: string;
  start_date: string;
  end_date: string;
}

const initialState: FormState = {
  name: '',
  client: '',
  address: '',
  google_maps_link: '',
  status: '',
  system_size: '',
  contract_value: '',
  current_stage: '',
  engineer: '',
  planning_engineer: '',
  sales_manager: '',
  start_date: '',
  end_date: '',
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Project name is required.';
  if (!form.client.trim()) errors.client = 'Client is required.';
  if (!form.address.trim()) errors.address = 'Address is required.';

  if (!form.status) errors.status = 'Status is required.';

  const cleanSystemSize = form.system_size.replace(/,/g, '');
  if (!cleanSystemSize.trim()) {
    errors.system_size = 'System size is required.';
  } else {
    const size = Number(cleanSystemSize);
    if (Number.isNaN(size)) errors.system_size = 'System size must be a number.';
    else if (size <= 0) errors.system_size = 'System size must be greater than 0.';
  }

  const cleanContractValue = form.contract_value.replace(/,/g, '');
  if (!cleanContractValue.trim()) {
    errors.contract_value = 'Contract value is required.';
  } else {
    const value = Number(cleanContractValue);
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

const formatNumberWithCommas = (value: string): string => {
  if (!value) return '';
  let cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    const integerPart = cleaned.slice(0, dotIndex);
    const decimalPart = cleaned.slice(dotIndex + 1);
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInteger}.${decimalPart}`;
  } else {
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

const parseCoordinatesFromMapLink = (link?: string): { lat: number; lng: number } | null => {
  if (!link) return null;
  const match = link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) || link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
};



const ProjectExecutionFormDialog: React.FC<ProjectExecutionFormDialogProps> = ({
  isOpen,
  setIsOpen,
  onSave,
  isSaving,
  project,
}) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusOpen, setStatusOpen] = useState(false);
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const [engineersList, setEngineersList] = useState<PlatformUser[]>([]);
  const [usersList, setUsersList] = useState<PlatformUser[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 6.9271, lng: 79.8612 });
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', channels: '', address: '', googleMapsLink: '' });
  const [regErrors, setRegErrors] = useState<Partial<Record<'name' | 'phone' | 'email' | 'channels' | 'address' | 'googleMapsLink', string>>>({});
  const [isRegSaving, setIsRegSaving] = useState(false);

  // Reset the form each time the dialog is opened.
  useEffect(() => {
    if (isOpen) {
      fetchClients().then(setClientsList).catch(console.error);
      fetchEngineers().then(setEngineersList).catch(console.error);
      fetchUsers().then(setUsersList).catch(console.error);

      if (project) {
        setForm({
          name: project.name || '',
          client: project.client || '',
          address: project.address || '',
          google_maps_link: project.location || '',
          status: project.status || '',
          system_size: formatNumberWithCommas(String(project.system_size || '')),
          contract_value: formatNumberWithCommas(String(project.contract_value || '')),
          current_stage: project.current_stage || '',
          engineer: project.engineer || '',
          planning_engineer: project.planning_engineer || '',
          sales_manager: project.sales_manager || '',
          start_date: project.start_date ? project.start_date.split('T')[0] : '',
          end_date: project.end_date ? project.end_date.split('T')[0] : '',
        });
        const coords = parseCoordinatesFromMapLink(project.location || undefined);
        if (coords) {
          setMapCenter(coords);
        } else {
          setMapCenter({ lat: 6.9271, lng: 79.8612 });
        }
      } else {
        setForm(initialState);
        setMapCenter({ lat: 6.9271, lng: 79.8612 });
      }
      setErrors({});
    }
  }, [isOpen, project]);

  const handleOpenRegChange = (open: boolean) => {
    setIsRegOpen(open);
    if (!open) {
      setRegForm({ name: '', phone: '', email: '', channels: '', address: '', googleMapsLink: '' });
      setRegErrors({});
    }
  };

  const handleRegChannelChange = (channel: string, checked: boolean) => {
    const currentChannels = regForm.channels ? regForm.channels.split(',').map((s) => s.trim()).filter(Boolean) : [];
    let updatedChannels: string[];
    if (checked) {
      if (!currentChannels.includes(channel)) {
        updatedChannels = [...currentChannels, channel];
      } else {
        updatedChannels = currentChannels;
      }
    } else {
      updatedChannels = currentChannels.filter((c) => c !== channel);
    }
    setRegForm((prev) => ({ ...prev, channels: updatedChannels.join(', ') }));
    setRegErrors((prev) => ({ ...prev, channels: undefined }));
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof regErrors = {};
    if (!regForm.name.trim()) newErrors.name = 'Client name is required.';
    if (!regForm.phone.trim()) newErrors.phone = 'Contact number is required.';
    if (!regForm.channels.trim()) newErrors.channels = 'Communication channels are required.';
    if (!regForm.address.trim()) newErrors.address = 'Address is required.';
    
    const includesEmail = regForm.channels.toLowerCase().includes('email');
    if (includesEmail && !regForm.email.trim()) {
      newErrors.email = 'Email address is required when Email is a selected channel.';
    } else if (regForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regForm.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setRegErrors(newErrors);
      return;
    }

    try {
      setIsRegSaving(true);
      const newClient = await registerClient({
        name: regForm.name,
        phone: regForm.phone,
        email: regForm.email,
        channels: regForm.channels,
        address: regForm.address,
        googleMapsLink: regForm.googleMapsLink,
      });
      setClientsList((prev) => [...prev, newClient]);
      
      setForm((prev) => ({
        ...prev,
        client: newClient.name,
        address: newClient.address || '',
        google_maps_link: newClient.googleMapsLink || '',
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.client;
        delete next.address;
        delete next.google_maps_link;
        return next;
      });

      const coords = parseCoordinatesFromMapLink(newClient.googleMapsLink || undefined);
      if (coords) {
        setMapCenter(coords);
      } else {
        setMapCenter({ lat: 6.9271, lng: 79.8612 });
      }

      setIsRegOpen(false);
      setRegForm({ name: '', phone: '', email: '', channels: '', address: '', googleMapsLink: '' });
      setRegErrors({});
      toast.success('Client registered and selected');
      setIsRegSaving(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to register client');
      setIsRegSaving(false);
    }
  };

  const clientOptions = clientsList.map((c) => ({
    value: c.name,
    label: c.name,
    keywords: `${c.name} ${c.phone}`,
  }));

  const engineerOptions = engineersList
    .map((e) => ({
      value: e.email,
      label: e.name || e.email,
      keywords: `${e.name || ''} ${e.email}`,
      group: e.role === 'planning_engineer' ? 'Planning Engineers' : 'Project Engineers',
    }));

  const salesManagerOptions = usersList
    .filter((u) => u.role === 'sales_manager')
    .map((u) => ({
      value: u.email,
      label: u.name || u.email,
      keywords: `${u.name || ''} ${u.email}`,
    }));

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleNumericChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: 'system_size' | 'contract_value'
  ) => {
    const input = e.target;
    const originalValue = input.value;
    const selectionStart = input.selectionStart;
    const formattedValue = formatNumberWithCommas(originalValue);
    
    setField(key, formattedValue);
    
    if (selectionStart !== null) {
      setTimeout(() => {
        const originalBeforeCursor = originalValue.slice(0, selectionStart);
        const originalCommasCount = (originalBeforeCursor.match(/,/g) || []).length;
        const cleanBeforeCursor = originalBeforeCursor.replace(/,/g, '');
        
        let formattedCommasCount = 0;
        let cleanCharIndex = 0;
        let formattedIndex = 0;
        
        while (cleanCharIndex < cleanBeforeCursor.length && formattedIndex < formattedValue.length) {
          if (formattedValue[formattedIndex] === ',') {
            formattedCommasCount++;
          } else {
            cleanCharIndex++;
          }
          formattedIndex++;
        }
        
        const newCursorPos = selectionStart + (formattedCommasCount - originalCommasCount);
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const coords = parseCoordinatesFromMapLink(form.google_maps_link);

    onSave({
      name: form.name.trim(),
      client: form.client.trim(),
      location: `${form.address.trim()} ||| ${form.google_maps_link.trim()}`,
      address: form.address.trim(),
      latitude: coords ? coords.lat : undefined,
      longitude: coords ? coords.lng : undefined,
      status: form.status as ProjectExecutionStatus,
      engineer: form.engineer.trim() || undefined,
      planning_engineer: form.planning_engineer.trim() || undefined,
      sales_manager: form.sales_manager.trim() || undefined,
      system_size: Number(form.system_size.replace(/,/g, '')),
      contract_value: Number(form.contract_value.replace(/,/g, '')),
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
          <DialogTitle>{project ? 'Edit Project' : 'Create Project'}</DialogTitle>
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
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="client">Client</Label>
                <button
                  type="button"
                  onClick={() => setIsRegOpen(true)}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-0.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Quick Add
                </button>
              </div>
              <Combobox
                id="client"
                options={clientOptions}
                value={form.client}
                onChange={(val) => {
                  setField('client', val);
                  const matched = clientsList.find((c) => c.name.toLowerCase() === val.toLowerCase());
                  if (matched) {
                    setForm((prev) => ({
                      ...prev,
                      client: val,
                      address: matched.address || '',
                      google_maps_link: matched.googleMapsLink || '',
                    }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.address;
                      delete next.google_maps_link;
                      return next;
                    });

                    const coords = parseCoordinatesFromMapLink(matched.googleMapsLink || undefined);
                    if (coords) {
                      setMapCenter(coords);
                    } else {
                      setMapCenter({ lat: 6.9271, lng: 79.8612 });
                    }
                  }
                }}
                placeholder="Select client"
                searchPlaceholder="Search clients..."
                emptyText="No clients found."
                className={errorClass('client')}
                modal={true}
              />
              <FieldError field="client" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                className={errorClass('address')}
                aria-invalid={!!errors.address}
                placeholder="e.g. 123 Galle Road, Colombo 03"
              />
              <FieldError field="address" />
            </div>
            <div>
              <Label htmlFor="google_maps_link">Google Maps Link</Label>
              <Input
                id="google_maps_link"
                value={form.google_maps_link}
                onChange={(e) => setField('google_maps_link', e.target.value)}
                className={errorClass('google_maps_link')}
                aria-invalid={!!errors.google_maps_link}
                placeholder="e.g. https://www.google.com/maps?q=..."
              />
              <FieldError field="google_maps_link" />
            </div>
            <div className="md:col-span-2 space-y-2 border-t pt-3">
              <Label>Project Location Map</Label>
              <MapPicker
                key={form.client}
                initialLat={mapCenter.lat}
                initialLng={mapCenter.lng}
                onLocationSelect={({ googleMapsLink }) => {
                  setForm((prev) => ({
                    ...prev,
                    google_maps_link: googleMapsLink,
                  }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.google_maps_link;
                    return next;
                  });
                }}
              />
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
                type="text"
                value={form.system_size}
                onChange={(e) => handleNumericChange(e, 'system_size')}
                className={errorClass('system_size')}
                aria-invalid={!!errors.system_size}
                placeholder="e.g. 12.50"
              />
              <FieldError field="system_size" />
            </div>
            <div>
              <Label htmlFor="contract_value">Contract Value (LKR)</Label>
              <Input
                id="contract_value"
                type="text"
                value={form.contract_value}
                onChange={(e) => handleNumericChange(e, 'contract_value')}
                className={errorClass('contract_value')}
                aria-invalid={!!errors.contract_value}
                placeholder="e.g. 1,500,000"
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
            <MultiSelectPopover
              label="Engineers"
              placeholder="No engineers assigned"
              emptyText="No engineers found."
              options={engineerOptions}
              selectedValues={[
                ...(form.engineer ? form.engineer.split(',').filter(Boolean) : []),
                ...(form.planning_engineer ? form.planning_engineer.split(',').filter(Boolean) : [])
              ]}
              onChange={(vals) => {
                const projectEmails = vals.filter(email => {
                  const eng = engineersList.find(e => e.email === email);
                  return eng?.role === 'project_engineer';
                });
                const planningEmails = vals.filter(email => {
                  const eng = engineersList.find(e => e.email === email);
                  return eng?.role === 'planning_engineer';
                });
                setField('engineer', projectEmails.join(','));
                setField('planning_engineer', planningEmails.join(','));
              }}
            />
            <MultiSelectPopover
              label="Sales Managers"
              placeholder="No sales managers assigned"
              emptyText="No sales managers found."
              options={salesManagerOptions}
              selectedValues={form.sales_manager ? form.sales_manager.split(',').filter(Boolean) : []}
              onChange={(vals) => setField('sales_manager', vals.join(','))}
            />
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> {isSaving ? (project ? 'Saving...' : 'Creating...') : (project ? 'Save Changes' : 'Create Project')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Register Client Modal */}
      <Dialog open={isRegOpen} onOpenChange={handleOpenRegChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegisterClient} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="reg_name">Client Name</Label>
                <Input
                  id="reg_name"
                  value={regForm.name}
                  onChange={(e) => {
                    setRegForm((prev) => ({ ...prev, name: e.target.value }));
                    setRegErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. John Doe"
                  className={regErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {regErrors.name && <p className="text-xs text-red-600">{regErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg_phone">Contact / Phone Number</Label>
                <Input
                  id="reg_phone"
                  value={regForm.phone}
                  onChange={(e) => {
                    setRegForm((prev) => ({ ...prev, phone: e.target.value }));
                    setRegErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="e.g. +94 77 123 4567"
                  className={regErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {regErrors.phone && <p className="text-xs text-red-600">{regErrors.phone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="reg_email">Email Address {(!regForm.channels.toLowerCase().includes('email')) && <span className="text-muted-foreground text-xs font-normal">(Optional)</span>}</Label>
                <Input
                  id="reg_email"
                  type="email"
                  value={regForm.email}
                  onChange={(e) => {
                    setRegForm((prev) => ({ ...prev, email: e.target.value }));
                    setRegErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. john@example.com"
                  className={regErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {regErrors.email && <p className="text-xs text-red-600">{regErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {['Phone', 'WhatsApp', 'Email'].map((channel) => {
                    const isChecked = regForm.channels
                      .split(',')
                      .map((s) => s.trim())
                      .includes(channel);
                    return (
                      <div key={channel} className="flex items-center space-x-2">
                        <Checkbox
                          id={`reg_channel_${channel.toLowerCase()}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            handleRegChannelChange(channel, !!checked);
                          }}
                        />
                        <Label
                          htmlFor={`reg_channel_${channel.toLowerCase()}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {channel}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {regErrors.channels && <p className="text-xs text-red-600">{regErrors.channels}</p>}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label>Geolocate client location on map</Label>
              <MapPicker
                onLocationSelect={({ googleMapsLink }) => {
                  setRegForm((prev) => ({ ...prev, googleMapsLink }));
                  setRegErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg_address">Street Address</Label>
              <Input
                id="reg_address"
                value={regForm.address}
                onChange={(e) => {
                  setRegForm((prev) => ({ ...prev, address: e.target.value }));
                  setRegErrors((prev) => ({ ...prev, address: undefined }));
                }}
                placeholder="Client address"
                className={regErrors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {regErrors.address && <p className="text-xs text-red-600">{regErrors.address}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg_maps">Google Maps Location Link</Label>
              <Input
                id="reg_maps"
                value={regForm.googleMapsLink}
                onChange={(e) => setRegForm((prev) => ({ ...prev, googleMapsLink: e.target.value }))}
                placeholder="Google Maps link"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenRegChange(false)} disabled={isRegSaving}>Cancel</Button>
              <Button type="submit" disabled={isRegSaving}>
                {isRegSaving ? 'Registering...' : 'Register & Select'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ProjectExecutionFormDialog;
