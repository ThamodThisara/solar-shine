import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Check, ChevronsUpDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  keywords?: string;
  group?: string;
}

interface MultiSelectPopoverProps {
  label: string;
  placeholder: string;
  emptyText: string;
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export const MultiSelectPopover: React.FC<MultiSelectPopoverProps> = ({
  label,
  placeholder,
  emptyText,
  options,
  selectedValues,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const toggleValue = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  // Group options by their 'group' field if present
  const groups: Record<string, SelectOption[]> = {};
  options.forEach((opt) => {
    const groupName = opt.group || '';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(opt);
  });

  const groupKeys = Object.keys(groups);

  // Group selected values by their group name for rendering
  const groupedSelected: Record<string, string[]> = {};
  selectedValues.forEach((val) => {
    const opt = options.find((o) => o.value === val);
    const groupName = opt?.group || '';
    if (!groupedSelected[groupName]) {
      groupedSelected[groupName] = [];
    }
    groupedSelected[groupName].push(val);
  });
  const selectedGroupKeys = Object.keys(groupedSelected);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 min-h-[38px] p-2 border border-input rounded-md bg-transparent">
        {selectedValues.length === 0 ? (
          <span className="text-muted-foreground text-sm pl-1.5 py-0.5">{placeholder}</span>
        ) : (
          <div className="space-y-3 w-full">
            {selectedGroupKeys.map((groupKey) => {
              const vals = groupedSelected[groupKey];
              return (
                <div key={groupKey} className="flex flex-wrap items-center gap-1.5">
                  {groupKey && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-full block mb-0.5">
                      {groupKey}
                    </span>
                  )}
                  {vals.map((val) => {
                    const opt = options.find((o) => o.value === val);
                    return (
                      <Badge key={val} variant="secondary" className="flex items-center gap-1 pr-1 py-0.5 text-xs">
                        {opt ? opt.label : val}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleValue(val);
                          }}
                          className="rounded-full outline-none hover:bg-muted-foreground/20 p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
            size="sm"
          >
            Add/Remove {label.toLowerCase()}...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-32px)] sm:w-[350px] max-h-[320px] overflow-hidden p-0" align="start" modal={true}>
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList className="max-h-[270px] overflow-y-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              {groupKeys.map((groupKey) => {
                const groupOptions = groups[groupKey];
                return (
                  <CommandGroup key={groupKey} heading={groupKey || undefined}>
                    {groupOptions.map((opt) => {
                      const isSelected = selectedValues.includes(opt.value);
                      return (
                        <CommandItem
                          key={opt.value}
                          value={(opt.keywords || opt.label).toLowerCase()}
                          onSelect={() => toggleValue(opt.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {opt.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
