import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AlertTriangle, UserCheck } from 'lucide-react';
import { Lead } from '@/types/payload-types';
import { fetchClients } from '@/services/clientService';

interface LeadConvertDialogProps {
  lead: Lead | null;
  setOpen: (open: boolean) => void;
  /** Called with an existing client $id to link, or undefined to create a new client. */
  onConvert: (existingClientId?: string) => void;
  isConverting: boolean;
}

type Mode = 'new' | 'existing';

const LeadConvertDialog: React.FC<LeadConvertDialogProps> = ({ lead, setOpen, onConvert, isConverting }) => {
  const [mode, setMode] = useState<Mode>('new');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (lead) {
      setMode('new');
      setClientId('');
    }
  }, [lead]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    enabled: !!lead && mode === 'existing',
  });
  // Only registered clients (with a document id) can be linked.
  const clientOptions = clients
    .filter((c) => c.$id)
    .map((c) => ({ value: c.$id!, label: `${c.clientCode ? `${c.clientCode} — ` : ''}${c.name}`, keywords: `${c.email} ${c.phone}` }));

  const missingContact = !!lead && (!lead.phone || !lead.email);
  const canSubmit = mode === 'new' ? !missingContact : !!clientId;

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={cn(
        'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={!!lead} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            {lead ? `${lead.lead_code} — ${lead.company || lead.name}` : ''} will be marked as won.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/40">
            {modeButton('new', 'Create new client')}
            {modeButton('existing', 'Link existing client')}
          </div>

          {mode === 'new' ? (
            missingContact ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A new client needs both a phone number and an email. Edit the lead to add them, or link an existing client instead.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                A client record is created from this lead's name, company, phone, email, and address, with the next available client code.
              </p>
            )
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="convert-client">Client</Label>
              <Combobox
                id="convert-client"
                modal
                value={clientId}
                onChange={setClientId}
                options={clientOptions}
                placeholder="Search registered clients..."
                searchPlaceholder="Search by name, code, email..."
                emptyText="No clients found."
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isConverting}>Cancel</Button>
          <Button
            onClick={() => onConvert(mode === 'existing' ? clientId : undefined)}
            disabled={!canSubmit || isConverting}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {isConverting ? 'Converting...' : 'Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadConvertDialog;
