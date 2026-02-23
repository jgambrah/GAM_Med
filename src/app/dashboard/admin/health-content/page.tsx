
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockHealthContent } from '@/lib/data';
import { HealthContent } from '@/lib/types';
import { AddEditContentDialog } from './components/add-edit-content-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function HealthContentPage() {
  const { user } = useAuth();
  const [content, setContent] = React.useState<HealthContent[]>([]);
  const [selectedContent, setSelectedContent] = React.useState<HealthContent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (user) {
        // SaaS LOGIC: Always filter by hospitalId first
        setContent(mockHealthContent.filter(c => c.hospitalId === user.hospitalId));
    }
  }, [user]);

  const handleSave = (newContent: HealthContent) => {
    if (content.some(c => c.contentId === newContent.contentId)) {
      // Update existing content
      setContent(prev => prev.map(c => c.contentId === newContent.contentId ? newContent : c));
    } else {
      // Add new content
      setContent(prev => [newContent, ...prev]);
    }
  };

  const openDialog = (content: HealthContent | null) => {
    setSelectedContent(content);
    setIsDialogOpen(true);
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold">Health Library Management</h1>
            <p className="text-muted-foreground">
                Create, edit, and manage articles for the patient portal.
            </p>
            </div>
            <Button onClick={() => openDialog(null)}>Add New Article</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Content Library</CardTitle>
            <CardDescription>A list of all published health education articles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.map(item => (
                    <TableRow key={item.contentId}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.keywords.join(', ')}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openDialog(item)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
       {isDialogOpen && (
         <AddEditContentDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            content={selectedContent}
            onSave={handleSave}
          />
       )}
    </>
  );
}
