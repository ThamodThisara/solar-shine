import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Terminal, Users as UsersIcon, Building, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeams, createTeam } from '@/services/teamService';
import type { Models } from 'appwrite';
import TeamMembersDialog from './user-management/TeamMembersDialog';
import { Badge } from '@/components/ui/badge';
import { fetchDepartments, fetchRoles, RoleRecord } from '@/services/roleService';

const UserManagementSection: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Models.Team<Models.Preferences> | null>(null);
  const [isAutoCreatingTeam, setIsAutoCreatingTeam] = useState<string | null>(null);

  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: isAdmin,
  });

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: isAdmin,
  });

  const { data, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => fetchTeams(),
    enabled: isAdmin,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load user groups: ${error.message}`),
    },
  });

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const teamList = data?.teams ?? [];
  const isLoading = isDeptsLoading || isRolesLoading || isTeamsLoading;

  const handleManageUsers = async (roleObj: RoleRecord) => {
    const matchedTeam = teamList.find((t) => t.prefs?.role === roleObj.slug);
    if (matchedTeam) {
      setSelectedTeam(matchedTeam);
    } else {
      setIsAutoCreatingTeam(roleObj.slug);
      try {
        const newTeam = await createTeam(roleObj.name, roleObj.slug);
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        setSelectedTeam(newTeam);
      } catch (error: any) {
        toast.error(`Failed to initialize role workspace: ${error.message}`);
      } finally {
        setIsAutoCreatingTeam(null);
      }
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage platform users and assign them to roles department-wise.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Input
        placeholder="Search roles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm shadow-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No departments found. Please seed or create departments first.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {departments.map((dept) => {
            const deptRoles = roles.filter(
              (r) =>
                (r.department_id === dept.slug || r.department_id === dept.$id || r.department_id === `dept_${dept.slug}`) &&
                (search === '' || r.name.toLowerCase().includes(search.toLowerCase()))
            );
            if (deptRoles.length === 0 && search !== '') return null;

            return (
              <AccordionItem key={dept.$id} value={dept.$id ?? dept.slug} className="border rounded-lg bg-white shadow-sm overflow-hidden px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">{dept.description || 'No description'}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  {deptRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 pl-2">No roles defined in this department.</p>
                  ) : (
                    <div>
                      {/* Mobile View: Vertical list of cards */}
                      <div className="block md:hidden space-y-3">
                        {deptRoles.map((roleObj) => {
                          const matchedTeam = teamList.find((t) => t.prefs?.role === roleObj.slug);
                          const memberCount = matchedTeam ? matchedTeam.total : 0;
                          const isAutoCreating = isAutoCreatingTeam === roleObj.slug;

                          return (
                            <div key={roleObj.$id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-gray-900">{roleObj.name}</span>
                                <Badge variant={memberCount > 0 ? 'secondary' : 'outline'} className="rounded-full px-2.5 py-0.5 text-xs">
                                  {memberCount} {memberCount === 1 ? 'user' : 'users'}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs py-1.5 h-auto flex items-center justify-center gap-1.5"
                                disabled={isAutoCreating}
                                onClick={() => handleManageUsers(roleObj)}
                              >
                                {isAutoCreating ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Initializing...
                                  </>
                                ) : (
                                  <>
                                    <UsersIcon className="h-3.5 w-3.5" />
                                    Manage Users
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop/Tablet View: Traditional table */}
                      <div className="hidden md:block overflow-hidden border rounded-md">
                        <Table>
                          <TableHeader className="bg-gray-50/50">
                            <TableRow>
                              <TableHead className="w-1/2">Role Name</TableHead>
                              <TableHead className="w-1/4">Members</TableHead>
                              <TableHead className="w-1/4 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deptRoles.map((roleObj) => {
                              const matchedTeam = teamList.find((t) => t.prefs?.role === roleObj.slug);
                              const memberCount = matchedTeam ? matchedTeam.total : 0;
                              const isAutoCreating = isAutoCreatingTeam === roleObj.slug;

                              return (
                                <TableRow key={roleObj.$id}>
                                  <TableCell className="font-medium align-middle">
                                    {roleObj.name}
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Badge variant={memberCount > 0 ? 'secondary' : 'outline'} className="rounded-full px-2.5 py-0.5">
                                      {memberCount} {memberCount === 1 ? 'user' : 'users'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right align-middle">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isAutoCreating}
                                      onClick={() => handleManageUsers(roleObj)}
                                    >
                                      {isAutoCreating ? (
                                        <>
                                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                          Initializing...
                                        </>
                                      ) : (
                                        <>
                                          <UsersIcon className="h-3.5 w-3.5 mr-1" />
                                          Manage Users
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {selectedTeam && (
        <TeamMembersDialog
          team={selectedTeam}
          open={!!selectedTeam}
          onOpenChange={(open) => { if (!open) setSelectedTeam(null); }}
        />
      )}
    </div>
  );
};

export default UserManagementSection;
