
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { SpecializedArea } from '@/types/payload-types';

interface SpecializedAreasTableProps {
  areas: SpecializedArea[];
  onEdit: (area: SpecializedArea) => void;
  onDelete: (id: string) => void;
}

const SpecializedAreasTable: React.FC<SpecializedAreasTableProps> = ({ areas, onEdit, onDelete }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {areas.map((area) => (
          <TableRow key={area.id}>
            <TableCell>
              <img src={area.image || '/placeholder.svg'} alt={area.title} className="w-16 h-16 object-cover rounded-md" />
            </TableCell>
            <TableCell className="font-medium">{area.title}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEdit(area)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(area.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SpecializedAreasTable;
