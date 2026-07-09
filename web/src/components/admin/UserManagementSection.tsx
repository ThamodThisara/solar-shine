import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Terminal, Trash2, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeams, createTeam, deleteTeam } from '@/services/teamService';
import type { Models } from 'appwrite';
import TeamMembersDialog from './user-management/TeamMembersDialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TEAM_ROLE_OPTIONS = [
  { value: 'project_engineer', label: 'Project Engineer' },
  { value: 'planning_engineer', label: 'Planning Engineer' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'admin', label: 'Administrator' },
  { value: 'hr', label: 'HR' },
];

const UserManagementSection: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('project_engineer');
  const [selectedTeam, setSelectedTeam] = useState<Models.Team<Models.Preferences> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams', search],
    queryFn: () => fetchTeams(search || undefined),
    enabled: isAdmin,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load teams: ${error.message}`),
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ name, role }: { name: string; role: string }) => createTeam(name, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateOpen(false);
      setNewTeamName('');
      setNewTeamRole('project_engineer');
      toast.success('Team created');
    },
    onError: () => toast.error('Failed to create team'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
    onError: () => toast.error('Failed to delete team'),
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

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage teams, and control who has access to them.</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Team
          </Button>
        </CardHeader>
      </Card>

      <Input
        placeholder="Search teams by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : teamList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No teams found.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap">Role</TableHead>
                <TableHead className="whitespace-nowrap">Members</TableHead>
                <TableHead className="whitespace-nowrap">Created</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamList.map((team) => (
                <TableRow key={team.$id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>
                    {team.prefs?.role ? (
                      <Badge variant="outline" className="capitalize">
                        {team.prefs.role.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">No role</span>
                    )}
                  </TableCell>
                  <TableCell>{team.total}</TableCell>
                  <TableCell>{new Date(team.$createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTeam(team)}>
                        <UsersIcon className="h-3.5 w-3.5 mr-1" /> View Members
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Team</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{team.name}"? This will remove all members and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(team.$id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Give your new team a name and select the default role for its members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Installation Crew"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-role">Default Member Role</Label>
              <Select value={newTeamRole} onValueChange={setNewTeamRole}>
                <SelectTrigger id="team-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate({ name: newTeamName, role: newTeamRole })}
              disabled={!newTeamName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
