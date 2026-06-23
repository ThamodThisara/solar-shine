import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';
import type { Models } from 'appwrite';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchTeamMembers, addTeamMember, removeTeamMember } from '@/services/teamService';

interface TeamMembersDialogProps {
  team: Models.Team<Models.Preferences>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleFilterOptions = [
  { id: 'all', label: 'All roles' },
  { id: 'owner', label: 'Owner' },
  { id: 'member', label: 'Member' },
];

const TeamMembersDialog: React.FC<TeamMembersDialogProps> = ({ team, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('member');

  const queryKey = ['team-members', team.$id, search];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTeamMembers(team.$id, search || undefined),
    enabled: open,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load members: ${error.message}`),
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['team-members', team.$id] });

  const addMutation = useMutation({
    mutationFn: (email: string) => addTeamMember(team.$id, email, [newRole]),
    onSuccess: (result, email) => {
      invalidate();
      if (result.emailError) {
        // Membership was created, but the setup email genuinely failed to send.
        toast.error(`${email} was added, but the setup email failed to send: ${result.emailError}`);
      } else if (result.emailSent) {
        toast.success(`Setup email sent to ${email}`);
      } else {
        // Existing user who already completed setup — no email needed.
        toast.success(`${email} added to the team`);
      }
      setNewEmail('');
      setNewRole('member');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => removeTeamMember(team.$id, membershipId),
    onSuccess: () => {
      invalidate();
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const members = (data?.memberships ?? []).filter(
    (m) => roleFilter === 'all' || m.roles.includes(roleFilter)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{team.name} — Members</DialogTitle>
          <DialogDescription>View, add, and remove members of this team.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 items-end flex-wrap border-b pb-4">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Input
              placeholder="Add member by email..."
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => addMutation.mutate(newEmail.trim())}
            disabled={!newEmail.trim() || addMutation.isPending}
          >
            <UserPlus className="h-4 w-4 mr-1" /> {addMutation.isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roleFilterOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No members found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.$id}>
                  <TableCell>{member.userName || '—'}</TableCell>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {member.roles.map((role) => (
                        <Badge key={role} variant="secondary">{role}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.confirm ? 'default' : 'outline'}>
                      {member.confirm ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.userEmail} from "{team.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMutation.mutate(member.$id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamMembersDialog;
