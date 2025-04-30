'use client';
import { Play16Filled } from '@fluentui/react-icons';
import type { editor, IDisposable } from '@xata.io/code-editor';
import { Monaco, MonacoEditor, parseSQLStatements, registerLanguageDiagnostics } from '@xata.io/code-editor';
import { Button, downloadFile, Tabs, TabsContent, TabsList, TabsTrigger } from '@xata.io/components';
import { useTheme } from 'next-themes';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SplitPaneLegacy, { SplitPaneProps } from 'react-split-pane';
import Styles from './query-editor.module.css';

// This library uses the old React.FC type and assumes children exists, so just a quick polyfill.
const SplitPane = SplitPaneLegacy as unknown as React.FC<SplitPaneProps & { children: React.ReactNode }>;

export type QueryEditorProps = {
  branchAndDatabaseSelector?: React.ReactNode;
};

type QueryLanguage = 'sql';

type Output = {
  error?: { title?: string; message?: string };
  results?: { title: string; data: any | null; json: any }[];
};

export const QueryEditor = ({ branchAndDatabaseSelector, ...props }: QueryEditorProps) => {
  const runCodeRef = useRef<() => void>(() => null);
  const loadFileRef = useRef<(snippet: any) => void>(() => null);
  const codeLensProviderRef = useRef<IDisposable | null>(null);
  const monacoInstanceRef = useRef<Monaco | null>(null);
  const intellisenseProviderRef = useRef<IDisposable | null>(null);
  const { theme } = useTheme();

  const [files, setFiles] = useState<{ id: string; name: string; content: string }[]>([]);

  const branchSchema = {
    rows: [
      {
        name: 'my_table',
        tables: []
      }
    ]
  };

  const [bottomPanelHeight, setBottomPanelHeight] = useState('50%');
  const [isMonacoLoading, setIsMonacoLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const outputRef = useRef<Output>({
    results: [{ title: 'Output', data: null, json: null }]
  });
  const tableName = Object.keys(branchSchema?.rows[0]?.tables || {})[0];

  const [, setOutputUpdate] = useState(0);
  const [currentQuery, setCurrentQuery] = useState<string[]>([]);

  useEffect(() => {
    if (monacoInstanceRef.current && branchSchema?.rows) {
      // Dispose of previous intellisense provider if it exists
      if (intellisenseProviderRef.current) {
        intellisenseProviderRef.current.dispose();
        intellisenseProviderRef.current = null;
      }

      intellisenseProviderRef.current = registerLanguageDiagnostics(monacoInstanceRef.current, []);

      // Force a re-validation of the current model to update diagnostics when the schema changes because completions will differ
      if (monacoInstanceRef.current.editor.getModels().length > 0) {
        monacoInstanceRef.current.editor.getModels().forEach((model) => {
          monacoInstanceRef.current?.editor.setModelMarkers(model, 'sql-quotes', []);
          monacoInstanceRef.current?.editor.setModelLanguage(model, model.getLanguageId()); // Trigger language re-registration
        });
      }
    }
  }, [branchSchema]);

  // Clean up intellisense providers on unmount
  useEffect(() => {
    return () => {
      if (intellisenseProviderRef.current) {
        intellisenseProviderRef.current.dispose();
        intellisenseProviderRef.current = null;
      }
      if (codeLensProviderRef.current) {
        codeLensProviderRef.current.dispose();
        codeLensProviderRef.current = null;
      }
    };
  }, []);

  const updateOutput = (newOutput: Output) => {
    outputRef.current = newOutput;
    setOutputUpdate((prev) => prev + 1);
  };

  const runCode = useCallback(
    async (monaco: Monaco, model: editor.ITextModel | null, options?: { range?: editor.FindMatch['range'] }) => {
      if (!model) return;

      const content = model.getValue();
      const allStatements = parseSQLStatements(content);
      const statementsToRun = options?.range
        ? allStatements.filter((stmt) => {
            return (
              stmt.range.startLineNumber >= options.range!.startLineNumber &&
              stmt.range.endLineNumber <= options.range!.endLineNumber
            );
          })
        : allStatements;

      setLoading(true);
      try {
        const results = await Promise.all(
          statementsToRun.map(async (stmt) => {
            if (!stmt) return null;
            const originalIndex = allStatements.findIndex(
              (s) =>
                s.range.startLineNumber === stmt.range.startLineNumber &&
                s.range.endLineNumber === stmt.range.endLineNumber
            );

            return {
              data: [],
              index: originalIndex
            };
          })
        );

        // Update the output state with the new results
        const newResults = [...(outputRef.current.results || [])];
        results.forEach((result) => {
          if (result) {
            newResults[result.index] = {
              title: `Output ${result.index + 1}`,
              data: result.data,
              json: null
            };
          }
        });

        updateOutput({
          results: newResults
        });

        // Only update active tab if running a single statement
        if (statementsToRun.length === 1) {
          const result = results[0];
          if (result) {
            setActiveTab(result.index);
          }
        }
      } catch (error: any) {
        updateOutput({ error: { message: error.message } });
      }
      setLoading(false);
    },
    [] // Empty dependency array since we're using refs
  );

  const handleAfterMount = useCallback(async (monaco: Monaco, editor: editor.IStandaloneCodeEditor) => {
    // Store monaco instance for later use
    monacoInstanceRef.current = monaco;

    intellisenseProviderRef.current = registerLanguageDiagnostics(monaco, []);

    runCodeRef.current = () => runCode(monaco, editor.getModel());
    loadFileRef.current = (snippet: { id: string; language: QueryLanguage; code: string }) => {
      const uri = monaco.Uri.parse(getFileName(snippet.id));
      const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel('', snippet.language, uri);
      monaco.editor.setModelLanguage(model, snippet.language);
      if (!editor.getModel()) editor.setModel(model);
    };

    const content = editor.getModel()?.getValue();
    const statements = parseSQLStatements(content ?? '');
    setCurrentQuery(statements.map((stmt) => stmt.value));

    editor.addAction({
      id: 'run',
      label: 'Run code',
      contextMenuGroupId: '1_modification',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: async (openEditor) => {
        const range = openEditor.getSelection() ?? undefined;
        await runCode(monaco, openEditor.getModel(), { range });
      }
    });

    const runCommand =
      editor.addCommand(0, (_context, model, range) => {
        void runCode(monaco, model, { range });
      }) ?? '';

    // Dispose of previous provider if it exists
    if (codeLensProviderRef.current) {
      codeLensProviderRef.current.dispose();
    }

    // Register new code lens provider and store in ref
    codeLensProviderRef.current = monaco.languages.registerCodeLensProvider('sql', {
      provideCodeLenses: function (model) {
        const sql = model.getValue();
        const lenses = parseSQLStatements(sql).map(({ id, range }) => ({
          id,
          range,
          command: { id: runCommand, title: 'Run statement', arguments: [model, range] }
        }));

        return { lenses, dispose: () => {} };
      },
      resolveCodeLens: function (_model, codeLens) {
        return codeLens;
      }
    });

    setIsMonacoLoading(false);
  }, []);

  const tabs = useMemo(() => {
    if (outputRef.current.error) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-bold">Error</h3>
            <p className="text-muted-foreground text-sm">{outputRef.current.error.message}</p>
          </div>
        </div>
      );
    }

    const tabs = outputRef.current.results?.map(({ title, data }) => ({
      title,
      panel: data ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-muted-foreground text-sm">{JSON.stringify(data, null, 2)}</p>
          </div>
        </div>
      ) : null
    }));
    return tabs;
  }, [outputRef.current.results, isMonacoLoading]);

  // Memoize the files object to prevent unnecessary remounts
  const editorFiles = useMemo(
    () =>
      files?.[0]?.content
        ? { 'test.sql': { code: files?.[0]?.content ?? '', language: 'sql' as const } }
        : {
            'test.sql': { code: `SELECT * FROM ${tableName ?? 'my_table'} LIMIT 1000;`, language: 'sql' as const }
          },
    [files?.[0]?.content]
  );

  return (
    <div className="h-full min-h-[80vh]" {...props}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="inline-block text-3xl font-bold">{files?.[0]?.name ?? 'Untitled'}</h1>
        </div>

        <div className="flex items-center gap-4">
          {branchAndDatabaseSelector}
          <Button disabled={loading} onClick={runCodeRef.current} data-testid="run-query-button">
            <Play16Filled className="h-4 w-4" /> {loading ? 'Running...' : 'Run code'}
          </Button>
        </div>
      </div>

      <div className="relative h-full">
        <div className="h-full">
          <SplitPane
            onChange={(size) => {
              setBottomPanelHeight(`calc(100% - ${size}px)`);
            }}
            pane2Style={{ height: bottomPanelHeight }}
            split="horizontal"
            allowResize
            resizerClassName={Styles.Resizer}
            defaultSize="50%"
            paneStyle={{ display: 'flex', overflow: 'scroll' }}
            resizerStyle={{ width: '100%', height: '4px', backgroundColor: 'primary' }}
          >
            <div className="flex w-full flex-1 flex-col">
              <MonacoEditor
                theme={theme ?? 'dark'}
                files={editorFiles}
                onAfterMount={handleAfterMount}
                onCodeChanged={async (_code, model) => {
                  const content = model.getValue();
                  const statements = parseSQLStatements(content);
                  setCurrentQuery(statements.map((stmt) => stmt.value));
                }}
              />
            </div>
            {Array.isArray(tabs) && tabs.length > 0 ? (
              <div className="flex h-full max-h-full w-full max-w-full flex-1 flex-col">
                <div className="my-8 flex justify-between px-4">
                  <Tabs
                    value={`tab-${activeTab}`}
                    onValueChange={(value) => setActiveTab(parseInt(value?.split('-')[1] ?? '0'))}
                    className="flex w-full flex-grow flex-col p-0"
                  >
                    <TabsList className="align-left flex w-full items-start justify-between bg-transparent p-0 text-left">
                      <div className="flex justify-start">
                        {tabs.map((_, index) => (
                          <TabsTrigger
                            value={`tab-${index}`}
                            key={`tab-${index}`}
                            className={`overflow-hidden px-4 py-2 text-sm font-medium ${
                              activeTab === index
                                ? 'border-primary border-b-2'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                          >
                            {`Output ${index + 1}`}
                          </TabsTrigger>
                        ))}
                      </div>
                      <div className="mb-4 flex items-center justify-end gap-4">
                        <Button
                          className="text-xs"
                          onClick={() => {
                            const files = outputRef.current.results?.map(({ data }, index) => ({
                              fileName: `output-${index + 1}`,
                              csv: Papa.unparse(data?.rows ?? [])
                            }));

                            for (const { fileName, csv } of files ?? []) {
                              downloadFile(fileName, new Blob([csv], { type: 'text/csv' }));
                            }
                          }}
                        >
                          Download CSV
                        </Button>
                      </div>
                    </TabsList>
                    {tabs.map(({ panel }, index) => (
                      <TabsContent
                        value={`tab-${index}`}
                        className="flex w-full flex-grow flex-col p-0"
                        key={`tab-${index}`}
                      >
                        {panel}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </div>
            ) : outputRef.current.error ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-bold">Error</h3>
                  <p className="text-muted-foreground text-sm">{outputRef.current.error.message}</p>
                </div>
              </div>
            ) : (
              <>null</>
            )}
          </SplitPane>
        </div>
      </div>
    </div>
  );
};

const getFileName = (id: string) => `input-${id}.sql`;
