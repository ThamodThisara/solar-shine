import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientRecord } from '@/services/clientService';
import { fetchSitesByClient, SiteRecord } from '@/services/siteService';
import { RegisterSiteDialog } from './RegisterSiteDialog';

interface ClientSitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
}

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={`space-y-1 ${className || ''}`}>
    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const num = (v?: number | null) => (v === null || v === undefined ? '—' : String(v));
const text = (v?: string) => (v && v.trim() ? v : '—');

export const ClientSitesDialog: React.FC<ClientSitesDialogProps> = ({ open, onOpenChange, client }) => {
  const { hasPermission } = useAuth();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<SiteRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites', client?.$id],
    queryFn: () => fetchSitesByClient(client!.$id!),
    enabled: open && !!client?.$id,
  });

  // Keep a valid site selected as the list loads/changes.
  useEffect(() => {
    if (sites.length === 0) {
      setSelectedSiteId('');
      return;
    }
    if (!sites.some((s) => s.$id === selectedSiteId)) {
      setSelectedSiteId(sites[0].$id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites]);

  const selectedSite: SiteRecord | undefined = sites.find((s) => s.$id === selectedSiteId) || sites[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sites</DialogTitle>
            <DialogDescription>
              {client ? <>Site information for <span className="font-medium text-foreground">{client.name}</span>.</> : 'Site information.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : `${sites.length} site${sites.length === 1 ? '' : 's'}`}
            </p>
            <div className="flex items-center gap-2">
              {selectedSite && hasPermission('client-sites:edit') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSiteToEdit(selectedSite);
                    setIsEditOpen(true);
                  }}
                >
                  <Edit className="mr-1 h-3.5 w-3.5" /> Edit Site
                </Button>
              )}
              {hasPermission('client-sites:create') && (
                <Button size="sm" onClick={() => { setSiteToEdit(null); setIsAddOpen(true); }} disabled={!client}>
                  <Plus className="mr-1 h-4 w-4" /> Add Site
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : sites.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No sites registered for this client yet.
            </div>
          ) : (
            <div className="space-y-4 py-1">
              {sites.length > 0 && (
                <div className="space-y-1">
                  <Label>Select Site</Label>
                  <Combobox
                    modal
                    value={selectedSiteId}
                    onChange={setSelectedSiteId}
                    placeholder="Select a site"
                    searchPlaceholder="Search sites..."
                    emptyText="No sites found."
                    options={sites.map((s) => ({
                      value: s.$id || '',
                      label: `${s.siteCode} — ${s.siteName}`,
                      keywords: `${s.siteCode} ${s.siteName}`,
                    }))}
                  />
                </div>
              )}

              {selectedSite && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4">
                  <Field label="Site Code">
                    <span className="font-mono font-semibold">{selectedSite.siteCode || '—'}</span>
                  </Field>
                  <Field label="Site Name">
                    <span className="font-semibold">{text(selectedSite.siteName)}</span>
                  </Field>
                  <Field label="Contact Person Name">{text(selectedSite.contactPersonName)}</Field>
                  <Field label="Contact Person Number">{text(selectedSite.contactPersonNumber)}</Field>
                  <Field label="Email Address">{text(selectedSite.email)}</Field>
                  <Field label="Communication Channels">
                    {selectedSite.channels && selectedSite.channels.trim() ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedSite.channels.split(',').map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-xs">
                            {ch.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </Field>
                  <Field label="Street Address" className="sm:col-span-2">{text(selectedSite.address)}</Field>
                  <Field label="Google Maps Location">
                    {selectedSite.googleMapsLink ? (
                      <a href={selectedSite.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                        View on Google Maps
                      </a>
                    ) : (
                      '—'
                    )}
                  </Field>

                  <div className="sm:col-span-2 border-t pt-3">
                    <p className="text-sm font-semibold text-foreground mb-2">Panel Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Panel Brand">{text(selectedSite.panelBrand)}</Field>
                      <Field label="Panel Model">{text(selectedSite.panelModel)}</Field>
                      <Field label="Panel Quantity">{num(selectedSite.panelQuantity)}</Field>
                      <Field label="Panel DC Capacity (kWp)">{num(selectedSite.panelDcCapacity)}</Field>
                    </div>
                  </div>

                  <div className="sm:col-span-2 border-t pt-3">
                    <p className="text-sm font-semibold text-foreground mb-2">Inverter Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Inverter Brand">{text(selectedSite.inverterBrand)}</Field>
                      <Field label="Inverter Model">{text(selectedSite.inverterModel)}</Field>
                      <Field label="Inverter Quantity">{num(selectedSite.inverterQuantity)}</Field>
                      <Field label="Inverter AC Capacity (kW)">{num(selectedSite.inverterAcCapacity)}</Field>
                    </div>
                  </div>

                  {selectedSite.description && selectedSite.description.trim() && (
                    <Field label="Description / Notes" className="sm:col-span-2 border-t pt-3">
                      <p className="whitespace-pre-wrap">{selectedSite.description}</p>
                    </Field>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegisterSiteDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        client={client}
        onSuccess={(site) => setSelectedSiteId(site.$id || '')}
      />

      <RegisterSiteDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        client={client}
        siteToEdit={siteToEdit}
        onSuccess={(site) => setSelectedSiteId(site.$id || '')}
      />
    </>
  );
};
