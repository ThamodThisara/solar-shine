import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPicker } from '@/components/ui/map-picker';
import { parseCoordinates } from '@/lib/utils';
import { resolveGoogleMapsLink } from '@/services/teamService';
import { ClientRecord } from '@/services/clientService';
import { fetchSitesByClient, generateNextSiteCode, registerSite, SiteRecord } from '@/services/siteService';

interface RegisterSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  onSuccess?: (site: SiteRecord) => void;
}

interface SiteForm {
  siteName: string;
  contactPersonName: string;
  contactPersonNumber: string;
  email: string;
  channels: string;
  googleMapsLink: string;
  address: string;
  panelBrand: string;
  panelModel: string;
  panelQuantity: string;
  panelDcCapacity: string;
  inverterBrand: string;
  inverterModel: string;
  inverterQuantity: string;
  inverterAcCapacity: string;
  description: string;
}

const emptyForm: SiteForm = {
  siteName: '',
  contactPersonName: '',
  contactPersonNumber: '',
  email: '',
  channels: '',
  googleMapsLink: '',
  address: '',
  panelBrand: '',
  panelModel: '',
  panelQuantity: '',
  panelDcCapacity: '',
  inverterBrand: '',
  inverterModel: '',
  inverterQuantity: '',
  inverterAcCapacity: '',
  description: '',
};

export const RegisterSiteDialog: React.FC<RegisterSiteDialogProps> = ({ open, onOpenChange, client, onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SiteForm, string>>>({});

  // Fetch the client's existing sites to derive the next site code and to
  // decide whether this is the first site (for prefilling contact details).
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites', client?.$id],
    queryFn: () => fetchSitesByClient(client!.$id!),
    enabled: open && !!client?.$id,
  });

  const isFirstSite = sites.length === 0;
  const nextSiteCode = client?.clientCode ? generateNextSiteCode(client.clientCode, sites) : '';

  // Prefill/reset the form whenever the dialog opens or the sites data settles.
  useEffect(() => {
    if (!open || !client || sitesLoading) return;
    if (sites.length === 0) {
      setForm({
        ...emptyForm,
        contactPersonName: client.name || '',
        contactPersonNumber: client.phone || '',
        email: client.email || '',
        channels: client.channels || '',
        googleMapsLink: client.googleMapsLink || '',
        address: client.address || '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.$id, sitesLoading]);

  const setField = (field: keyof SiteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleChannelChange = (channel: string, checked: boolean) => {
    const current = form.channels ? form.channels.split(',').map((s) => s.trim()).filter(Boolean) : [];
    let updated: string[];
    if (checked) {
      updated = current.includes(channel) ? current : [...current, channel];
    } else {
      updated = current.filter((c) => c !== channel);
    }
    setField('channels', updated.join(', '));
  };

  const handlePasteMapsLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error('Clipboard is empty.');
        return;
      }

      const coords = parseCoordinates(text);
      if (coords) {
        setField('googleMapsLink', text);
        toast.success('Location link pasted and validated successfully!');
        return;
      }

      if (text.startsWith('http') && (text.includes('maps.app.goo.gl') || text.includes('goo.gl/maps'))) {
        const loadingToast = toast.loading('Resolving shortened Google Maps link...');
        try {
          const result = await resolveGoogleMapsLink(text);
          toast.dismiss(loadingToast);
          if (result && result.lat && result.lng) {
            setField('googleMapsLink', result.resolvedUrl);
            toast.success('Location link resolved and validated successfully!');
          } else {
            toast.error('Could not extract coordinates from resolved URL.');
          }
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error(`Resolution failed: ${err instanceof Error ? err.message : err}`);
        }
        return;
      }

      toast.error('Invalid Google Maps link format.');
    } catch (err) {
      toast.error('Failed to read from clipboard.');
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.siteName.trim()) newErrors.siteName = 'Site name is required.';

    const includesEmail = form.channels.toLowerCase().includes('email');
    if (includesEmail && !form.email.trim()) {
      newErrors.email = 'Email address is required when Email is a selected channel.';
    } else if (form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
      const payload: SiteRecord = {
        clientId: client!.$id!,
        clientCode: client!.clientCode,
        siteName: form.siteName,
        contactPersonName: form.contactPersonName,
        contactPersonNumber: form.contactPersonNumber,
        email: form.email,
        channels: form.channels,
        googleMapsLink: form.googleMapsLink,
        address: form.address,
        panelBrand: form.panelBrand,
        panelModel: form.panelModel,
        panelQuantity: toNum(form.panelQuantity),
        panelDcCapacity: toNum(form.panelDcCapacity),
        inverterBrand: form.inverterBrand,
        inverterModel: form.inverterModel,
        inverterQuantity: toNum(form.inverterQuantity),
        inverterAcCapacity: toNum(form.inverterAcCapacity),
        description: form.description,
      };
      return registerSite(payload);
    },
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ['sites', client?.$id] });
      toast.success(`Site ${site.siteCode} registered`);
      onOpenChange(false);
      onSuccess?.(site);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to register site'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (!validate()) return;
    mutation.mutate();
  };

  const coords = parseCoordinates(form.googleMapsLink);
  const channelIsEmail = form.channels.toLowerCase().includes('email');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Site</DialogTitle>
          <DialogDescription>
            {client ? <>Add a site for <span className="font-medium text-foreground">{client.name}</span>.</> : 'Add a site.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="site_code">Site Code</Label>
              <Input
                id="site_code"
                value={sitesLoading ? 'Generating…' : nextSiteCode}
                readOnly
                tabIndex={-1}
                className="bg-muted text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={form.siteName}
                onChange={(e) => setField('siteName', e.target.value)}
                placeholder="e.g. Rooftop Array"
                className={errors.siteName ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.siteName && <p className="text-xs text-red-600">{errors.siteName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="site_contact_name">Contact Person Name</Label>
              <Input
                id="site_contact_name"
                value={form.contactPersonName}
                onChange={(e) => setField('contactPersonName', e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="site_contact_number">Contact Person Number</Label>
              <Input
                id="site_contact_number"
                value={form.contactPersonNumber}
                onChange={(e) => setField('contactPersonNumber', e.target.value)}
                placeholder="e.g. +94 77 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="site_email">Email Address {!channelIsEmail && <span className="text-muted-foreground text-xs font-normal">(Optional)</span>}</Label>
              <Input
                id="site_email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="e.g. john@example.com"
                className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Communication Channels</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {['Phone', 'WhatsApp', 'Email'].map((channel) => {
                  const isChecked = form.channels.split(',').map((s) => s.trim()).includes(channel);
                  return (
                    <div key={channel} className="flex items-center space-x-2">
                      <Checkbox
                        id={`site_channel_${channel.toLowerCase()}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleChannelChange(channel, !!checked)}
                      />
                      <Label htmlFor={`site_channel_${channel.toLowerCase()}`} className="text-sm font-normal cursor-pointer">
                        {channel}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t pt-3">
            <Label htmlFor="site_maps">Google Maps Location Link</Label>
            <div className="relative">
              <Input
                id="site_maps"
                value={form.googleMapsLink}
                onChange={(e) => setField('googleMapsLink', e.target.value)}
                placeholder="Google Maps URL"
                className="pr-10"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                onClick={handlePasteMapsLink}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Location on Map</Label>
            <MapPicker
              initialLat={coords?.lat}
              initialLng={coords?.lng}
              onLocationSelect={({ googleMapsLink }) => setField('googleMapsLink', googleMapsLink)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="site_address">Street Address</Label>
            <Input
              id="site_address"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Site address"
            />
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-semibold text-foreground">Panel Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="panel_brand">Panel Brand</Label>
                <Input id="panel_brand" value={form.panelBrand} onChange={(e) => setField('panelBrand', e.target.value)} placeholder="e.g. Jinko" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="panel_model">Panel Model</Label>
                <Input id="panel_model" value={form.panelModel} onChange={(e) => setField('panelModel', e.target.value)} placeholder="e.g. Tiger Neo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="panel_qty">Panel Quantity</Label>
                <Input id="panel_qty" type="number" min="0" value={form.panelQuantity} onChange={(e) => setField('panelQuantity', e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="panel_dc">Panel DC Capacity (kWp)</Label>
                <Input id="panel_dc" type="number" min="0" step="any" value={form.panelDcCapacity} onChange={(e) => setField('panelDcCapacity', e.target.value)} placeholder="e.g. 11.4" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-semibold text-foreground">Inverter Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="inv_brand">Inverter Brand</Label>
                <Input id="inv_brand" value={form.inverterBrand} onChange={(e) => setField('inverterBrand', e.target.value)} placeholder="e.g. Huawei" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv_model">Inverter Model</Label>
                <Input id="inv_model" value={form.inverterModel} onChange={(e) => setField('inverterModel', e.target.value)} placeholder="e.g. SUN2000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv_qty">Inverter Quantity</Label>
                <Input id="inv_qty" type="number" min="0" value={form.inverterQuantity} onChange={(e) => setField('inverterQuantity', e.target.value)} placeholder="e.g. 1" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv_ac">Inverter AC Capacity (kW)</Label>
                <Input id="inv_ac" type="number" min="0" step="any" value={form.inverterAcCapacity} onChange={(e) => setField('inverterAcCapacity', e.target.value)} placeholder="e.g. 10" />
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t pt-3">
            <Label htmlFor="site_description">Description / Notes</Label>
            <Textarea
              id="site_description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Additional notes about this site"
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || sitesLoading}>
              {mutation.isPending ? 'Registering...' : 'Register Site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
