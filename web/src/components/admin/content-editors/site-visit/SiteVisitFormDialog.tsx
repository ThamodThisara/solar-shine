import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Save } from 'lucide-react';
import { CreateSiteVisitInput } from '@/services/siteVisitService';
import { fetchEngineers } from '@/services/userService';
import { SiteVisitPriority, SiteVisitStatus } from '@/types/payload-types';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/lib/siteVisits';
import { MultiSelectPopover } from '@/components/ui/multi-select-popover';

interface ProjectOption {
  $id: string;
  name: string;
  client: string;
  engineer?: string;
  planning_engineer?: string;
}

interface SiteVisitFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  projects: ProjectOption[];
  /** Pre-selected (and locked) project id when launched from a chosen project. */
  lockedProjectId?: string;
  createdBy: string;
  /** Admins can pick/optionally leave unassigned; engineers self-assign with no picker. */
  canAssignEngineer: boolean;
  /** The current user, used to self-assign engineer-created visits. */
  currentUser: { $id: string; name: string };
  onSave: (input: CreateSiteVisitInput) => void;
  isSaving: boolean;
}

interface FormState {
  project_id: string;
  title: string;
  assigned_engineer_id: string;
  reason: string;
  priority: SiteVisitPriority;
  status: SiteVisitStatus;
  visit_date: string;
  expected_completion_date: string;
  issue_observation: string;
  description: string;
  location_details: string;
  additional_notes: string;
}

const buildInitialState = (lockedProjectId?: string): FormState => ({
  project_id: lockedProjectId ?? '',
  title: '',
  assigned_engineer_id: '',
  reason: '',
  priority: 'medium',
  status: 'scheduled',
  visit_date: '',
  expected_completion_date: '',
  issue_observation: '',
  description: '',
  location_details: '',
  additional_notes: '',
});

type FormErrors = Partial<Record<keyof FormState, string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.project_id) errors.project_id = 'Project is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.reason.trim()) errors.reason = 'A reason for the visit is required.';
  if (
    form.visit_date &&
    form.expected_completion_date &&
    new Date(form.expected_completion_date) < new Date(form.visit_date)
  ) {
    errors.expected_completion_date = 'Expected completion cannot be before the visit date.';
  }
  return errors;
};

const SiteVisitFormDialog: React.FC<SiteVisitFormDialogProps> = ({
  isOpen,
  setIsOpen,
  projects,
  lockedProjectId,
  createdBy,
  canAssignEngineer,
  currentUser,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState<FormState>(buildInitialState(lockedProjectId));
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: engineers = [], isLoading: isEngineersLoading } = useQuery({
    queryKey: ['engineers'],
    queryFn: () => fetchEngineers(),
    enabled: isOpen && canAssignEngineer,
  });

  const selectedProject = projects.find((p) => p.$id === form.project_id);
  const projectEmails = new Set<string>();
  if (selectedProject) {
    if (selectedProject.engineer) {
      selectedProject.engineer.split(',').forEach((email) => projectEmails.add(email.trim().toLowerCase()));
    }
    if (selectedProject.planning_engineer) {
      selectedProject.planning_engineer.split(',').forEach((email) => projectEmails.add(email.trim().toLowerCase()));
    }
  }

  const filteredEngineers = engineers.filter((eng) => projectEmails.has(eng.email.toLowerCase()));
  const engineerOptions = filteredEngineers.map((eng) => ({
    value: eng.$id,
    label: eng.name || eng.email,
    keywords: eng.email,
    group: eng.role === 'planning_engineer' ? 'Planning Engineers' : 'Project Engineers',
  }));

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(lockedProjectId));
      setErrors({});
    }
  }, [isOpen, lockedProjectId]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Admins may assign multiple engineers or leave it unassigned; engineers always
    // create visits assigned to themselves (they have no engineer picker).
    let assignedId = undefined;
    let assignedName = undefined;
    if (canAssignEngineer) {
      const ids = form.assigned_engineer_id ? form.assigned_engineer_id.split(',').filter(Boolean) : [];
      if (ids.length > 0) {
        assignedId = ids.join(',');
        assignedName = ids.map((id) => {
          const eng = engineers.find((e) => e.$id === id);
          return eng ? (eng.name || eng.email) : id;
        }).join(',');
      }
    } else {
      assignedId = currentUser.$id;
      assignedName = currentUser.name;
    }

    onSave({
      project_id: form.project_id,
      title: form.title.trim(),
      reason: form.reason.trim(),
      assigned_engineer_id: assignedId,
      assigned_engineer_name: assignedName,
      issue_observation: form.issue_observation.trim() || undefined,
      description: form.description.trim() || undefined,
      priority: form.priority,
      visit_date: form.visit_date || undefined,
      expected_completion_date: form.expected_completion_date || undefined,
      location_details: form.location_details.trim() || undefined,
      status: form.status,
      additional_notes: form.additional_notes.trim() || undefined,
      created_by: createdBy,
    });
  };

  const FieldError: React.FC<{ field: keyof FormState }> = ({ field }) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null;

  const errorClass = (key: keyof FormState) =>
    errors[key] ? 'border-red-500 focus-visible:ring-red-500' : '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create Site Visit</DialogTitle>
          <DialogDescription>
            {canAssignEngineer
              ? 'Assign an engineer (optional) and record the details of the site inspection.'
              : 'Record the details of the site inspection. It will be assigned to you.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sv-project">Project</Label>
              <Combobox
                id="sv-project"
                modal
                value={form.project_id}
                onChange={(v) => {
                  setField('project_id', v);
                  setField('assigned_engineer_id', ''); // Clear engineers on project change
                }}
                disabled={!!lockedProjectId}
                placeholder="Select a project"
                searchPlaceholder="Search projects..."
                emptyText="No projects found."
                className={errorClass('project_id')}
                options={projects.map((p) => ({ value: p.$id, label: p.project_code || p.name, keywords: `${p.project_code || ''} ${p.name} ${p.client || ''}` }))}
              />
              <FieldError field="project_id" />
            </div>
            {canAssignEngineer && (
              <div className="col-span-1 md:col-span-2">
                <MultiSelectPopover
                  label="Assigned Engineers"
                  placeholder={isEngineersLoading ? 'Loading engineers...' : 'Unassigned (visible to all engineers)'}
                  emptyText="No engineers found."
                  options={engineerOptions}
                  selectedValues={form.assigned_engineer_id ? form.assigned_engineer_id.split(',').filter(Boolean) : []}
                  onChange={(vals) => setField('assigned_engineer_id', vals.join(','))}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="sv-title">Site Visit Title</Label>
            <Input
              id="sv-title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className={errorClass('title')}
              placeholder="e.g. Inverter fault inspection"
            />
            <FieldError field="title" />
          </div>

          <div>
            <Label htmlFor="sv-reason">Reason for Visit</Label>
            <Textarea
              id="sv-reason"
              value={form.reason}
              onChange={(e) => setField('reason', e.target.value)}
              className={errorClass('reason')}
              rows={2}
              placeholder="Why is this visit being scheduled?"
            />
            <FieldError field="reason" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sv-priority">Priority Level</Label>
              <select
                id="sv-priority"
                value={form.priority}
                onChange={(e) => setField('priority', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sv-status">Status</Label>
              <select
                id="sv-status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sv-visit-date">Visit Date</Label>
              <Input
                id="sv-visit-date"
                type="date"
                value={form.visit_date}
                onChange={(e) => setField('visit_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sv-completion-date">Expected Completion Date</Label>
              <Input
                id="sv-completion-date"
                type="date"
                value={form.expected_completion_date}
                onChange={(e) => setField('expected_completion_date', e.target.value)}
                className={errorClass('expected_completion_date')}
              />
              <FieldError field="expected_completion_date" />
            </div>
          </div>

          <div>
            <Label htmlFor="sv-issue">Issue / Observation</Label>
            <Textarea
              id="sv-issue"
              value={form.issue_observation}
              onChange={(e) => setField('issue_observation', e.target.value)}
              rows={2}
              placeholder="Reported issue or initial observation"
            />
          </div>

          <div>
            <Label htmlFor="sv-description">Description</Label>
            <Textarea
              id="sv-description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              placeholder="Detailed description of the work to be carried out"
            />
          </div>

          <div>
            <Label htmlFor="sv-notes">Additional Notes</Label>
            <Input
              id="sv-notes"
              value={form.additional_notes}
              onChange={(e) => setField('additional_notes', e.target.value)}
              placeholder="Anything else the engineer should know"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Creating...' : 'Create Site Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SiteVisitFormDialog;
