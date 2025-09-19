

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';
import { mockHealthContent } from '@/lib/data';
import { HealthContent } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Newspaper } from 'lucide-react';

export default function HealthLibraryPage() {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filteredContent, setFilteredContent] = React.useState<HealthContent[]>(mockHealthContent);

    const filterContent = useDebouncedCallback((query: string) => {
        if (!query) {
            setFilteredContent(mockHealthContent);
        } else {
            const lowercasedQuery = query.toLowerCase();
            const filtered = mockHealthContent.filter(content =>
                content.title.toLowerCase().includes(lowercasedQuery) ||
                content.body.toLowerCase().includes(lowercasedQuery) ||
                content.keywords.some(kw => kw.toLowerCase().includes(lowercasedQuery))
            );
            setFilteredContent(filtered);
        }
    }, 300);
    
    React.useEffect(() => {
        filterContent(searchQuery);
    }, [searchQuery, filterContent]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Health Library</h1>
                <p className="text-muted-foreground">
                    A collection of articles and resources to help you manage your health.
                </p>
            </div>
            
             <div className="flex justify-center mb-4">
                <Input
                    placeholder="Search for articles (e.g., 'hypertension', 'diet')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-lg"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.length > 0 ? (
                    filteredContent.map(content => (
                        <Card key={content.contentId} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-start gap-2">
                                    <Newspaper className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                    <span>{content.title}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-muted-foreground text-sm line-clamp-4">
                                    {content.body}
                                </p>
                            </CardContent>
                             <CardContent>
                                {content.fileUrl && (
                                     <Button asChild variant="outline">
                                        <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Download PDF Guide
                                        </a>
                                    </Button>
                                )}
                             </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-16">
                        <p className="text-muted-foreground">No health articles found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
