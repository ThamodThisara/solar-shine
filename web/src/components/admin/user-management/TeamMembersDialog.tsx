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
import { fetchTeamMembers, addTeamMember, removeTeamMember, resendInvitation } from '@/services/teamService';
import { useDebounce } from '@/hooks/useDebounce';

interface TeamMembersDialogProps {
  team: Models.Team<Models.Preferences>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TeamMembersDialog: React.FC<TeamMembersDialogProps> = ({ team, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [newEmail, setNewEmail] = useState('');

  const queryKey = ['team-members', team.$id, debouncedSearch];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTeamMembers(team.$id, debouncedSearch || undefined),
    enabled: open,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load members: ${error.message}`),
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['team-members', team.$id] });

  const addMutation = useMutation({
    mutationFn: (email: string) => addTeamMember(team.$id, email, ['member']),
    onSuccess: (result, email) => {
      invalidate();
      if (result.emailError) {
        toast.error(`${email} was added, but the setup email failed to send: ${result.emailError}`);
      } else if (result.emailSent) {
        toast.success(`Setup email sent to ${email}`);
      } else {
        toast.success(`${email} added to the team`);
      }
      setNewEmail('');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to add member'),
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) => resendInvitation(team.$id, email),
    onSuccess: (result, email) => {
      if (result.emailError) {
        toast.error(`Failed to send setup email: ${result.emailError}`);
      } else if (result.emailSent) {
        toast.success(`Setup email sent to ${email}`);
      } else {
        toast.error(`Failed to send setup email`);
      }
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to resend invitation'),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => removeTeamMember(team.$id, membershipId),
    onSuccess: () => {
      invalidate();
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const members = data?.memberships ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{team.name} - Members</DialogTitle>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-sm"
          />
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
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.$id}>
                  <TableCell className="max-w-[180px] truncate font-medium" title={member.userName || '—'}>
                    {member.userName || '—'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={member.userEmail}>
                    {member.userEmail}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.confirm ? 'default' : 'outline'}>
                      {member.confirm ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {!member.confirm && (
                        <Button
                          variant="outline"
                          className="h-8 px-2.5 text-xs whitespace-nowrap"
                          onClick={() => resendMutation.mutate(member.userEmail)}
                          disabled={resendMutation.isPending}
                        >
                          {resendMutation.isPending ? 'Sending...' : 'Resend'}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                    </div>
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
