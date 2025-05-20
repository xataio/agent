'use client';
import { useQuery } from '@tanstack/react-query';
import {
  cn,
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
} from '@xata.io/components';
import { Check, CircleX, FileText } from 'lucide-react';
import path from 'path';
import { CSSProperties, useState } from 'react';
import { EvalFile, evalResponseSchema } from '~/evals/api-schemas';
import { EvalSummary } from '~/evals/lib/schemas';

const TestSidebar = ({
  evalSummaries,
  onTestSelect,
  selectedTest
}: {
  evalSummaries: EvalSummary[];
  onTestSelect: (testId: string) => void;
  selectedTest: string | null;
}) => {
  const testCount = evalSummaries.length;
  const passedTests = evalSummaries.filter((es) => es.result === 'passed').length;
  const passPercentage = Math.round((passedTests / testCount) * 100);
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Eval run</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{passedTests}</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-medium">{testCount}</span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-800">
              {passPercentage}%
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {evalSummaries.map((evalSummary) => {
                const isActive = selectedTest === evalSummary.id;
                return (
                  <SidebarMenuItem key={evalSummary.id}>
                    <SidebarMenuButton
                      onClick={() => onTestSelect(evalSummary.id)}
                      isActive={isActive}
                      className={cn(
                        'cursor-pointer justify-between transition-colors',
                        isActive ? 'bg-primary/20 dark:bg-primary/30 font-medium' : 'hover:bg-muted/50'
                      )}
                    >
                      <span>{evalSummary.id}</span>
                      {evalSummary.result === 'passed' ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <CircleX className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};

const CurrentEval = ({
  evalSummary,
  files,
  isLoading,
  error
}: {
  evalSummary: EvalSummary | undefined;
  files: EvalFile[] | undefined;
  isLoading: boolean;
  error: any;
}) => {
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-2.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (error || !files) {
    return (
      <div className="h-[calc(100vh-2.5rem)] items-center justify-center">
        <p className="text-red-600">Error loading files make sure you set EVAL=true in you .env.local</p>
      </div>
    );
  }
  return (
    <Tabs defaultValue={files[0]?.fileName} className="h-full">
      <div className="mr-4 mt-4 flex items-center justify-between">
        <TabsList>
          {files.map((file) => {
            return (
              <TabsTrigger value={file.fileName} className="flex cursor-pointer items-center gap-1" key={file.fileName}>
                <FileText className="h-4 w-4" />
                {file.fileName}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Status:</span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              evalSummary?.result === 'passed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {evalSummary?.result === 'passed' ? <Check className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
            {evalSummary?.result === 'passed' ? 'Pass' : 'Fail'}
          </span>
        </div>
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

export const TestSuiteViewer: React.FC<{
  evalSummaries: EvalSummary[];
  evalFolder: string;
  initialEvalId: string | undefined;
}> = ({ evalSummaries, evalFolder, initialEvalId }) => {
  const initialEval = initialEvalId
    ? evalSummaries.find((evalSummary) => evalSummary.id === initialEvalId)
    : evalSummaries[0];

  const [selectedEvalId, setSelectedEvalId] = useState<string>(initialEval?.id ?? '');

  const currentEval = evalSummaries.find((evalSummary) => evalSummary.id === selectedEvalId);
  const {
    data: filesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['evalFiles', evalFolder, selectedEvalId],
    queryFn: () => fetchFiles(path.join(evalFolder, selectedEvalId)),
    retry: false
  });

  const handleTestClick = (testId: string) => {
    setSelectedEvalId(testId);
  };
  if (!initialEval) {
    return <div>No evals found</div>;
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '30rem'
        } as CSSProperties
      }
    >
      <div className="flex h-screen w-full">
        <TestSidebar evalSummaries={evalSummaries} onTestSelect={handleTestClick} selectedTest={selectedEvalId} />
        <main className="flex-1 overflow-hidden">
          <div className="flex h-10 items-center border-b px-4">
            <SidebarTrigger />
          </div>
          <CurrentEval evalSummary={currentEval} files={filesData?.files} isLoading={isLoading} error={error} />
        </main>
      </div>
    </SidebarProvider>
  );
};
