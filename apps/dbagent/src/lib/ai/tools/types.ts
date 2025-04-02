import { Tool } from 'ai';

export interface ToolsetGroup {
  toolset(): Record<string, Tool>;
}

export type ToolsetBuilderFunction = () => Record<string, Tool>;

export type Toolset = ToolsetGroup | ToolsetBuilderFunction | Record<string, Tool>;

export function mergeToolsets(...toolsets: Toolset[]): Record<string, Tool> {
  const sets: Record<string, Tool>[] = toolsets.map((toolset) => {
    if (typeof toolset === 'function') {
      return toolset();
    } else if ('toolset' in toolset) {
      return (toolset as ToolsetGroup).toolset();
    }
    return toolset;
  });
  return sets.reduce((acc, tool) => ({ ...acc, ...tool }), {});
}
