'use client';
import {
  ScrollArea,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@internal/components';
import { useQuery } from '@tanstack/react-query';
import { Check, CircleX, FileText } from 'lucide-react';
import path from 'path';
import { useState } from 'react';
import { EvalFile, evalResponseSchema } from '~/evals/apiSchemas';
import { TestCaseSummary } from '~/evals/lib/schemas';

const TestSidebar = ({
  evalSummaries,
  onTestSelect,
  selectedTest
}: {
  evalSummaries: TestCaseSummary[];
  onTestSelect: (testId: string) => void;
  selectedTest: string | null;
}) => {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="px-2 py-1">
          <h2 className="text-lg font-semibold">Eval run</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {evalSummaries.map((evalSummary) => (
                <SidebarMenuItem key={evalSummary.id}>
                  <SidebarMenuButton
                    onClick={() => onTestSelect(evalSummary.id)}
                    isActive={selectedTest === evalSummary.id}
                    className="justify-between"
                  >
                    <span>{evalSummary.id}</span>
                    {evalSummary.result === 'passed' ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <CircleX className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};

const TestFiles = ({ files, isLoading, error }: { files: EvalFile[] | undefined; isLoading: boolean; error: any }) => {
  if (isLoading || !files) {
    return (
      <div className="h-[calc(100vh-2.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-[calc(100vh-2.5rem)] items-center justify-center">
        <p className="text-red-600">Error loading files</p>
      </div>
    );
  }
  return (
    <Tabs defaultValue={files[0]?.fileName} className="h-full">
      <div className="flex items-center justify-between">
        <TabsList>
          {files.map((file) => {
            return (
              <TabsTrigger value={file.fileName} className="flex items-center gap-1" key={file.fileName}>
                <FileText className="h-4 w-4" />
                {file.fileName}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {files.map((file) => {
        return (
          <TabsContent
            value={file.fileName}
            className="mt-4 h-[calc(100%-40px)] rounded-md border p-4"
            key={file.fileName}
          >
            <ScrollArea className="h-full">
              <pre className="whitespace-pre-wrap font-mono text-sm">{file.contents}</pre>
            </ScrollArea>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

const fetchFiles = async (folderPath: string) => {
  const response = await fetch(`/api/evals?folder=${folderPath}`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return evalResponseSchema.parse(await response.json());
};

export const TestSuiteViewer: React.FC<{ evalSummaries: TestCaseSummary[]; evalFolder: string }> = ({
  evalSummaries,
  evalFolder
}) => {
  const firstEval = evalSummaries[0];
  if (!firstEval) {
    return <div>No evals found</div>;
  }
  const [selectedEval, setSelectedEval] = useState<string>(firstEval.id);

  const {
    data: filesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['evalFiles', evalFolder, selectedEval],
    queryFn: () => fetchFiles(path.join(evalFolder, selectedEval))
  });

  const handleTestClick = (testId: string) => {
    setSelectedEval(testId);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <TestSidebar evalSummaries={evalSummaries} onTestSelect={handleTestClick} selectedTest={selectedEval} />
        <main className="flex-1 overflow-hidden">
          <div className="flex h-10 items-center border-b px-4">
            <SidebarTrigger />
          </div>
          <TestFiles files={filesData?.files} isLoading={isLoading} error={error} />
        </main>
      </div>
    </SidebarProvider>
  );
};
