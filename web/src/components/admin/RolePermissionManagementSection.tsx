import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, Plus, Building, Key, Check, AlertTriangle, ShieldCheck, ChevronRight, ChevronDown, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  fetchDepartments,
  fetchRoles,
  createDepartment,
  createRole,
  updateRole,
  deleteRole,
  seedDefaultStructure,
  DepartmentRecord,
  RoleRecord,
} from '@/services/roleService';
import { PERMISSION_MODULES } from '@/config/permissions';
import { fetchTeams } from '@/services/teamService';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export const RolePermissionManagementSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    dashboard: true,
  });

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };
  
  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleRecord | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // New entry fields
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDept, setNewRoleDept] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  // React Query queries
  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => fetchTeams(),
  });
  const teamList = teamsData?.teams || [];

  const selectedRole = roles.find((r) => r.$id === selectedRoleId) || null;

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(null);
      setRoleToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });

  const handleDeleteRole = (roleObj: RoleRecord) => {
    const matchedTeam = teamList.find((t) => t.prefs?.role === roleObj.slug);
    const memberCount = matchedTeam ? matchedTeam.total : 0;

    if (memberCount > 0) {
      toast.error(`Cannot delete role "${roleObj.name}" because there are ${memberCount} user(s) assigned to it.`);
      return;
    }

    setRoleToDelete(roleObj);
    setIsDeleteConfirmOpen(true);
  };

  const isStructureEmpty = departments.length === 0 && roles.length === 0;

  const seedMutation = useMutation({
    mutationFn: seedDefaultStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Successfully seeded default departments and roles!');
    },
    onError: (error: any) => {
      toast.error(`Failed to seed structure: ${error.message}`);
    }
  });

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: () => createDepartment(newDeptName, newDeptDesc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptModalOpen(false);
      setNewDeptName('');
      setNewDeptDesc('');
      toast.success('Department created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create department: ${error.message}`);
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: () => createRole(newRoleName, newRoleDept, newRolePerms),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDept('');
      setNewRolePerms([]);
      setSelectedRoleId(data.$id || null);
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateRole(id, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role permissions updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to save permissions: ${error.message}`);
    },
  });

  // Handle saving permissions matrix
  const handleTogglePermission = (permissionKey: string) => {
    if (!selectedRole || !selectedRole.$id) return;
    
    let updatedPerms = [...selectedRole.permissions];
    if (updatedPerms.includes(permissionKey)) {
      updatedPerms = updatedPerms.filter((p) => p !== permissionKey);
    } else {
      updatedPerms.push(permissionKey);
    }
    
    updateRoleMutation.mutate({ id: selectedRole.$id, permissions: updatedPerms });
  };

  const handleSelectAllModule = (moduleKey: string, selectAll: boolean) => {
    if (!selectedRole || !selectedRole.$id) return;

    const modulePermissions = PERMISSION_MODULES.find((m) => m.id === moduleKey)?.permissions.map((p) => p.key) || [];
    let updatedPerms = [...selectedRole.permissions];

    if (selectAll) {
      // Add all missing ones
      modulePermissions.forEach((key) => {
        if (!updatedPerms.includes(key)) {
          updatedPerms.push(key);
        }
      });
    } else {
      // Remove all belonging to this module
      updatedPerms = updatedPerms.filter((key) => !modulePermissions.includes(key));
    }

    updateRoleMutation.mutate({ id: selectedRole.$id, permissions: updatedPerms });
  };

  const handleToggleNewRolePermission = (permissionKey: string) => {
    setNewRolePerms((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((p) => p !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  // Group roles by department
  const getRolesForDepartment = (dept: DepartmentRecord) => {
    return roles.filter((r) => 
      r.department_id === dept.slug || 
      r.department_id === dept.$id || 
      r.department_id === `dept_${dept.slug}`
    );
  };

  if (isDeptsLoading || isRolesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-none shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-950">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Role & Permission Matrix
            </CardTitle>
            <CardDescription className="mt-1">
              Create dynamic organization departments, add roles, and customize active permission matrices in real-time.
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsDeptModalOpen(true)} className="flex-grow sm:flex-grow-0">
              <Building className="h-4 w-4 mr-1.5" />
              Add Department
            </Button>
            <Button size="sm" onClick={() => setIsRoleModalOpen(true)} className="flex-grow sm:flex-grow-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Role
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isStructureEmpty ? (
        <Card className="max-w-md mx-auto text-center border-dashed border-2 border-gray-200 dark:border-slate-800 p-8 mt-12 bg-white/50 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-col items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Seed Roles & Departments</CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-500">
              Your Appwrite database structure is initialized but empty. Seed the standard Solar Shine departments, roles, and default permissions matrix to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? 'Seeding Structure...' : 'Seed Default Structure'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Departments & Roles Directory */}
          <Card className={cn("shadow-sm border-gray-100 dark:border-slate-800 lg:col-span-1", selectedRoleId !== null ? "hidden lg:block" : "block")}>
            <CardHeader className="py-4 border-b border-gray-100 dark:border-slate-800">
              <CardTitle className="text-base font-semibold">Organizational Structure</CardTitle>
              <CardDescription>Select a role to manage its active system permissions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[550px] px-4 py-2">
                {departments.map((dept) => {
                  const deptRoles = getRolesForDepartment(dept);
                  return (
                    <div key={dept.$id} className="py-3 border-b border-gray-50 last:border-0 dark:border-slate-900">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        {dept.name}
                      </h3>
                      {deptRoles.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-5 py-1">No roles added yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {deptRoles.map((role) => {
                            const isSelected = selectedRoleId === role.$id;
                            return (
                              <button
                                key={role.$id}
                                onClick={() => setSelectedRoleId(role.$id || null)}
                                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-colors text-sm ${
                                  isSelected
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Key className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                                  {role.name}
                                </span>
                                <ChevronRight className="h-3 w-3 opacity-60" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Side: Permission Switch Matrix */}
          <Card className={cn("shadow-sm border-gray-100 dark:border-slate-800 lg:col-span-2", selectedRoleId === null ? "hidden lg:block" : "block")}>
            <CardHeader className="py-4 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-0 h-auto mr-1 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedRoleId(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {selectedRole ? `Permissions: ${selectedRole.name}` : 'Permission Settings'}
                  </CardTitle>
                  <CardDescription>
                    {selectedRole
                      ? `Belongs to ${departments.find((d) => `dept_${d.slug}` === selectedRole.department_id || d.slug === selectedRole.department_id || d.$id === selectedRole.department_id)?.name || 'Department'}`
                      : 'Select a role from the sidebar to inspect and configure permission settings.'}
                  </CardDescription>
                </div>
              </div>
              {selectedRole && (
                <div className="flex items-center gap-2">
                  {selectedRole.is_system && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-none font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Root Admin Role
                    </Badge>
                  )}
                  {!selectedRole.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRole(selectedRole)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete Role
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selectedRole ? (
                <ScrollArea className="h-[550px] p-4 sm:p-6">
                  {selectedRole.is_system && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3.5 mb-6 flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">System Protected Role</h4>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                          This role is system-protected. Administrators have bypass authorizations across all modules. Changes below will not limit admin privileges.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {PERMISSION_MODULES.map((module) => {
                      const allActive = module.permissions.every((p) => selectedRole.permissions.includes(p.key));
                      const someActive = module.permissions.some((p) => selectedRole.permissions.includes(p.key)) && !allActive;
                      const isExpanded = !!expandedModules[module.id];

                      return (
                        <div key={module.id} className="border border-gray-100 dark:border-slate-800 rounded-lg overflow-hidden">
                          <div
                            className="flex justify-between items-center p-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                            onClick={() => toggleModuleExpanded(module.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{module.title}</h4>
                              {someActive && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary">Modified</Badge>}
                              {allActive && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-green-500/10 text-green-500 border-green-500/20 font-medium">All Active</Badge>}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={selectedRole.is_system}
                              className="h-7 text-xs px-2 hover:bg-gray-200/50 dark:hover:bg-slate-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAllModule(module.id, !allActive);
                              }}
                            >
                              {allActive ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="p-4 pt-2 space-y-3.5 border-t border-gray-100 dark:border-slate-800 bg-background">
                              {module.permissions.map((perm) => {
                                const isActive = selectedRole.permissions.includes(perm.key);
                                return (
                                  <div key={perm.key} className="flex items-start justify-between gap-4 py-1.5 last:pb-0 border-b border-muted/20 last:border-0">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-medium cursor-pointer" htmlFor={`switch-${perm.key}`}>
                                        {perm.label}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                                    </div>
                                    <Switch
                                      id={`switch-${perm.key}`}
                                      checked={isActive || selectedRole.is_system}
                                      disabled={selectedRole.is_system || updateRoleMutation.isPending}
                                      onCheckedChange={() => handleTogglePermission(perm.key)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <Shield className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
                  <h3 className="font-semibold text-gray-700 dark:text-slate-300">No Role Selected</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                    Select a department role on the left directory to adjust its permissions configuration.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Department Dialog */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>
              Create a new organizational team category. Role categories will map to departments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering, Logistics"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                placeholder="Brief summary of duties"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createDeptMutation.mutate()}
              disabled={!newDeptName || createDeptMutation.isPending}
            >
              {createDeptMutation.isPending ? 'Saving...' : 'Save Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Assign the new role to a department and grant its initial configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  placeholder="e.g., Senior Project Engineer"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="role-dept">Department</Label>
                <Select value={newRoleDept} onValueChange={setNewRoleDept}>
                  <SelectTrigger id="role-dept">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.$id} value={dept.slug || ''}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-semibold mb-2 block">Initial Permissions Matrix</Label>
              <ScrollArea className="h-[250px] border rounded-md p-3 space-y-4 bg-gray-50/50 dark:bg-slate-900/30">
                {PERMISSION_MODULES.map((module) => (
                  <div key={module.id} className="space-y-2 mb-4 last:mb-0">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{module.title}</h5>
                    <div className="space-y-1.5">
                      {module.permissions.map((perm) => {
                        const isChecked = newRolePerms.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => handleToggleNewRolePermission(perm.key)}
                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                          >
                            <div className={`h-4 w-4 border rounded flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-gray-300 bg-white'
                            }`}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <div className="leading-tight">
                              <span className="text-xs font-medium">{perm.label}</span>
                              <span className="text-[10px] text-muted-foreground block">{perm.description}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRoleMutation.mutate()}
              disabled={!newRoleName || !newRoleDept || createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete Role?"
        description={roleToDelete ? `Are you sure you want to delete the role "${roleToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteRoleMutation.isPending}
        onConfirm={() => {
          if (roleToDelete?.$id) {
            deleteRoleMutation.mutate(roleToDelete.$id);
          }
        }}
      />
    </div>
  );
};
