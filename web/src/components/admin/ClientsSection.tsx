import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ShieldAlert, Eye, Clipboard, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { fetchClients, registerClient, updateClient, deleteClient, generateNextClientCode, ClientRecord } from '@/services/clientService';
import { fetchProjectExecutionOptions } from '@/services/projectExecutionService';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MapPicker } from '@/components/ui/map-picker';
import { parseCoordinates } from '@/lib/utils';
import { resolveGoogleMapsLink } from '@/services/teamService';
import { Checkbox } from '@/components/ui/checkbox';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { RegisterSiteDialog } from './RegisterSiteDialog';
import { ClientSitesDialog } from './ClientSitesDialog';

export const ClientsSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const CLIENTS_PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  
  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  // Delete Confirmation Modal States
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Site Dialog States
  const [isSiteRegisterOpen, setIsSiteRegisterOpen] = useState(false);
  const [siteRegisterClient, setSiteRegisterClient] = useState<ClientRecord | null>(null);
  const [isSitesViewOpen, setIsSitesViewOpen] = useState(false);
  const [sitesViewClient, setSitesViewClient] = useState<ClientRecord | null>(null);

  // Forms
  const [form, setForm] = useState({ name: '', phone: '', email: '', channels: '', address: '', googleMapsLink: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  
  // Assigned Clients cache to disable delete button
  const [assignedMap, setAssignedMap] = useState<Record<string, boolean>>({});

  // Fetch Clients
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load clients: ${error.message}`),
    },
  });

  // Load project assignments
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const projects = await fetchProjectExecutionOptions();
        const map: Record<string, boolean> = {};
        projects.forEach((p) => {
          if (p.client) map[p.client.toLowerCase()] = true;
        });
        setAssignedMap(map);
      } catch (err) {
        console.warn('Failed to load project execution clients mapping', err);
      }
    };
    loadAssignments();
  }, [clients]);

  // Actions mutations
  const createMutation = useMutation({
    mutationFn: registerClient,
    onSuccess: (createdClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Client registered');
      // Every client must have at least one site — open the Register Site form
      // immediately so the user can add the client's first site.
      setSiteRegisterClient(createdClient);
      setIsSiteRegisterOpen(true);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to register client'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ oldName, updated }: { oldName: string; updated: ClientRecord }) =>
      updateClient(oldName, updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditOpen(false);
      setSelectedClient(null);
      resetForm();
      toast.success('Client updated successfully');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update client'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted successfully');
      setIsDeleteConfirmOpen(false);
      setClientToDelete(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete client'),
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', channels: '', address: '', googleMapsLink: '' });
    setErrors({});
  };

  const handleChannelChange = (channel: string, checked: boolean) => {
    const currentChannels = form.channels ? form.channels.split(',').map((s) => s.trim()).filter(Boolean) : [];
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
    setForm((prev) => ({ ...prev, channels: updatedChannels.join(', ') }));
    setErrors((prev) => ({ ...prev, channels: undefined }));
  };

  const validate = (formState: typeof form): boolean => {
    const newErrors: typeof errors = {};
    if (!formState.name.trim()) newErrors.name = 'Client name is required.';
    if (!formState.phone.trim()) newErrors.phone = 'Contact number is required.';
    if (!formState.channels.trim()) newErrors.channels = 'Communication channels are required.';
    if (!formState.address.trim()) newErrors.address = 'Address is required.';

    const includesEmail = formState.channels.toLowerCase().includes('email');
    if (includesEmail && !formState.email.trim()) {
      newErrors.email = 'Email address is required when Email is a selected channel.';
    } else if (formState.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formState.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) return;
    createMutation.mutate(form);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!validate(form)) return;
    updateMutation.mutate({ oldName: selectedClient.name, updated: form });
  };

  const openEdit = (client: ClientRecord) => {
    setSelectedClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      channels: client.channels,
      address: client.address || '',
      googleMapsLink: client.googleMapsLink || '',
    });
    setErrors({});
    setIsEditOpen(true);
  };

  const openView = (client: ClientRecord) => {
    setSelectedClient(client);
    setIsViewOpen(true);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      c.phone.includes(search)
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PAGE_SIZE));
  const paginatedClients = filteredClients.slice(page * CLIENTS_PAGE_SIZE, (page + 1) * CLIENTS_PAGE_SIZE);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Client Management</CardTitle>
            <CardDescription>View, edit, register and manage clients in the system.</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Register Client
          </Button>
        </CardHeader>
      </Card>

      <Input
        placeholder="Search clients by name, email or phone..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No clients found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Code</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Contact / Phone</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Communication Channels</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => {
                  const isAssigned = assignedMap[client.name.toLowerCase()] || false;
                  return (
                    <TableRow key={client.name}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{client.clientCode || '—'}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.channels.split(',').map((ch) => (
                            <Badge key={ch} variant="secondary" className="text-xs">
                              {ch.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openView(client)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!client.$id) {
                                toast.error('This client has no saved record, so sites cannot be managed.');
                                return;
                              }
                              setSitesViewClient(client);
                              setIsSitesViewOpen(true);
                            }}
                          >
                            <MapPin className="h-3.5 w-3.5 mr-1" /> Sites
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (isAssigned) {
                                toast.error("Cannot delete client because they are currently assigned to a project.");
                                return;
                              }
                              setClientToDelete(client.name);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="text-destructive hover:text-destructive/90"
                            title="Delete Client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <SimplePagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            pageSize={CLIENTS_PAGE_SIZE}
            onPageChange={setPage}
            label="clients"
          />
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Client</DialogTitle>
            <DialogDescription>Add a new client profile to the system.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2" noValidate>
            <div className="space-y-1">
              <Label htmlFor="create_client_code">Client Code</Label>
              <Input
                id="create_client_code"
                value={generateNextClientCode(clients)}
                readOnly
                tabIndex={-1}
                className="bg-muted text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create_name">Client Name</Label>
                <Input
                  id="create_name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. John Doe"
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_phone">Contact / Phone Number</Label>
                <Input
                  id="create_phone"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, phone: e.target.value }));
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="e.g. +94 77 123 4567"
                  className={errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create_email">Email Address {!form.channels.toLowerCase().includes('email') && <span className="text-muted-foreground text-xs font-normal">(Optional)</span>}</Label>
                <Input
                  id="create_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. john@example.com"
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {['Phone', 'WhatsApp', 'Email'].map((channel) => {
                    const isChecked = form.channels
                      .split(',')
                      .map((s) => s.trim())
                      .includes(channel);
                    return (
                      <div key={channel} className="flex items-center space-x-2">
                        <Checkbox
                          id={`create_channel_${channel.toLowerCase()}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            handleChannelChange(channel, !!checked);
                          }}
                        />
                        <Label
                          htmlFor={`create_channel_${channel.toLowerCase()}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {channel}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {errors.channels && <p className="text-xs text-red-600">{errors.channels}</p>}
              </div>
            </div>

            <div className="space-y-1 border-t pt-3">
              <Label htmlFor="create_maps">Google Maps Location Link</Label>
              <div className="relative">
                <Input
                  id="create_maps"
                  value={form.googleMapsLink}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, googleMapsLink: e.target.value }));
                    setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                  }}
                  placeholder="Google Maps URL"
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (!text) {
                        toast.error("Clipboard is empty.");
                        return;
                      }

                      const coords = parseCoordinates(text);
                      if (coords) {
                        setForm((prev) => ({ ...prev, googleMapsLink: text }));
                        setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                        toast.success("Location link pasted and validated successfully!");
                        return;
                      }

                      if (text.startsWith("http") && (text.includes("maps.app.goo.gl") || text.includes("goo.gl/maps"))) {
                        const loadingToast = toast.loading("Resolving shortened Google Maps link...");
                        try {
                          const result = await resolveGoogleMapsLink(text);
                          toast.dismiss(loadingToast);
                          if (result && result.lat && result.lng) {
                            setForm((prev) => ({ ...prev, googleMapsLink: result.resolvedUrl }));
                            setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                            toast.success("Location link resolved and validated successfully!");
                          } else {
                            toast.error("Could not extract coordinates from resolved URL.");
                          }
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          toast.error(`Resolution failed: ${err.message || err}`);
                        }
                        return;
                      }

                      toast.error("Invalid Google Maps link format.");
                    } catch (err) {
                      toast.error("Failed to read from clipboard.");
                    }
                  }}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Location on Map</Label>
              {(() => {
                const coords = parseCoordinates(form.googleMapsLink);
                return (
                  <MapPicker
                    initialLat={coords?.lat}
                    initialLng={coords?.lng}
                    onLocationSelect={({ googleMapsLink }) => {
                      setForm((prev) => ({ ...prev, googleMapsLink }));
                      setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                    }}
                  />
                );
              })()}
            </div>

            <div className="space-y-1">
              <Label htmlFor="create_address">Street Address</Label>
              <Input
                id="create_address"
                value={form.address}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, address: e.target.value }));
                  setErrors((prev) => ({ ...prev, address: undefined }));
                }}
                placeholder="Client address"
                className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering...' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
            <DialogDescription>Modify settings for this client profile.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2" noValidate>
            <div className="space-y-1">
              <Label htmlFor="edit_client_code">Client Code</Label>
              <Input
                id="edit_client_code"
                value={selectedClient?.clientCode || '—'}
                readOnly
                className="bg-muted text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>
            {selectedClient && assignedMap[selectedClient.name.toLowerCase()] && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-md text-xs flex gap-2 items-start border border-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Client is Assigned to a Project</p>
                  <p className="mt-0.5">Renaming is disabled because this client is linked to active project execution data.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_name">Client Name</Label>
                <Input
                  id="edit_name"
                  value={form.name}
                  disabled={selectedClient ? assignedMap[selectedClient.name.toLowerCase()] : false}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. John Doe"
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_phone">Contact / Phone Number</Label>
                <Input
                  id="edit_phone"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, phone: e.target.value }));
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="e.g. +94 77 123 4567"
                  className={errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_email">Email Address {!form.channels.toLowerCase().includes('email') && <span className="text-muted-foreground text-xs font-normal">(Optional)</span>}</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. john@example.com"
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {['Phone', 'WhatsApp', 'Email'].map((channel) => {
                    const isChecked = form.channels
                      .split(',')
                      .map((s) => s.trim())
                      .includes(channel);
                    return (
                      <div key={channel} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit_channel_${channel.toLowerCase()}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            handleChannelChange(channel, !!checked);
                          }}
                        />
                        <Label
                          htmlFor={`edit_channel_${channel.toLowerCase()}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {channel}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {errors.channels && <p className="text-xs text-red-600">{errors.channels}</p>}
              </div>
            </div>

            <div className="space-y-1 border-t pt-3">
              <Label htmlFor="edit_maps">Google Maps Location Link</Label>
              <div className="relative">
                <Input
                  id="edit_maps"
                  value={form.googleMapsLink}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, googleMapsLink: e.target.value }));
                    setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                  }}
                  placeholder="Google Maps URL"
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (!text) {
                        toast.error("Clipboard is empty.");
                        return;
                      }

                      const coords = parseCoordinates(text);
                      if (coords) {
                        setForm((prev) => ({ ...prev, googleMapsLink: text }));
                        setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                        toast.success("Location link pasted and validated successfully!");
                        return;
                      }

                      if (text.startsWith("http") && (text.includes("maps.app.goo.gl") || text.includes("goo.gl/maps"))) {
                        const loadingToast = toast.loading("Resolving shortened Google Maps link...");
                        try {
                          const result = await resolveGoogleMapsLink(text);
                          toast.dismiss(loadingToast);
                          if (result && result.lat && result.lng) {
                            setForm((prev) => ({ ...prev, googleMapsLink: result.resolvedUrl }));
                            setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                            toast.success("Location link resolved and validated successfully!");
                          } else {
                            toast.error("Could not extract coordinates from resolved URL.");
                          }
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          toast.error(`Resolution failed: ${err.message || err}`);
                        }
                        return;
                      }

                      toast.error("Invalid Google Maps link format.");
                    } catch (err) {
                      toast.error("Failed to read from clipboard.");
                    }
                  }}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Location on Map</Label>
              {(() => {
                const coords = parseCoordinates(form.googleMapsLink);
                return (
                  <MapPicker
                    initialLat={coords?.lat}
                    initialLng={coords?.lng}
                    onLocationSelect={({ googleMapsLink }) => {
                      setForm((prev) => ({ ...prev, googleMapsLink }));
                      setErrors((prev) => ({ ...prev, googleMapsLink: undefined }));
                    }}
                  />
                );
              })()}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit_address">Street Address</Label>
              <Input
                id="edit_address"
                value={form.address}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, address: e.target.value }));
                  setErrors((prev) => ({ ...prev, address: undefined }));
                }}
                placeholder="Client address"
                className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>Full profile details for this client.</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Client Code</span>
                <p className="text-sm font-mono font-semibold text-foreground">{selectedClient.clientCode || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Client Name</span>
                <p className="text-sm font-semibold text-foreground">{selectedClient.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contact / Phone Number</span>
                <p className="text-sm text-foreground">{selectedClient.phone}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email Address</span>
                <p className="text-sm text-foreground">{selectedClient.email || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Communication Channels</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {selectedClient.channels.split(',').map((ch) => (
                    <Badge key={ch} variant="secondary" className="text-xs">
                      {ch.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2 border-t pt-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Street Address</span>
                <p className="text-sm text-foreground">{selectedClient.address || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Google Maps Location</span>
                <p className="text-sm text-foreground">
                  {selectedClient.googleMapsLink ? (
                    <a
                      href={selectedClient.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      View on Google Maps
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Project Status</span>
                <div className="mt-0.5">
                  {assignedMap[selectedClient.name.toLowerCase()] ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                      Assigned to Active Project(s)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Unassigned
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Site (opens automatically after client registration, and from Sites popup) */}
      <RegisterSiteDialog
        open={isSiteRegisterOpen}
        onOpenChange={setIsSiteRegisterOpen}
        client={siteRegisterClient}
      />

      {/* Client Sites popup */}
      <ClientSitesDialog
        open={isSitesViewOpen}
        onOpenChange={setIsSitesViewOpen}
        client={sitesViewClient}
      />

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete Client"
        description={clientToDelete ? `Are you sure you want to delete ${clientToDelete}? This action cannot be undone.` : ''}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (clientToDelete) {
            deleteMutation.mutate(clientToDelete);
          }
        }}
      />
    </div>
  );
};
