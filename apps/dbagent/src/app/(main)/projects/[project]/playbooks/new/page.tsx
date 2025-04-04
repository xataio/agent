import { actionGetCustomPlaybook, actionGetCustomPlaybooks } from '~/components/playbooks/action';
import { CustomPlaybookForm } from '~/components/playbooks/custom-playbook-form';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

export default async function NewPlaybookPage({
  params,
  searchParams
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ playbookName?: string; customPlaybookId?: string; copyCount?: string }>;
}) {
  const { project } = await params;
  const { playbookName, customPlaybookId, copyCount } = await searchParams;
  let initialData;

  const findAvailablePlayBookName = async (project: string, baseName: string, startCount: number): Promise<string> => {
    const customPlaybooks = await actionGetCustomPlaybooks(project);
    const existingNames = new Set(customPlaybooks.map((p) => p.name));

    let count = startCount;
    let newName = `${baseName} (Copy ${count})`;

    while (existingNames.has(newName)) {
      count++;
      newName = `${baseName} (Copy ${count})`;
    }

    return newName;
  };

  const startCount = copyCount ? parseInt(copyCount) + 1 : 1;

  try {
    if (playbookName) {
      const builtInPlaybook = getPlaybookDetails(playbookName);
      if (builtInPlaybook) {
        const originalName = builtInPlaybook.name.replace(/ \(Copy \d+\)$/, '');
        const availableName = await findAvailablePlayBookName(project, originalName, startCount);

        initialData = {
          name: availableName,
          description: builtInPlaybook.description,
          content: builtInPlaybook.content,
          isBuiltIn: true
        };
      }
    } else if (customPlaybookId) {
      const customPlaybook = await actionGetCustomPlaybook(project, customPlaybookId);
      if (customPlaybook) {
        const originalName = customPlaybook.name.replace(/ \(Copy \d+\)$/, '');
        const availableName = await findAvailablePlayBookName(project, originalName, startCount);

        initialData = {
          name: availableName,
          description: customPlaybook.description,
          content: customPlaybook.content,
          isBuiltIn: false
        };
      }
    }
  } catch (error) {
    console.error('Error getting playbook data:', error);
  }

  return <CustomPlaybookForm initialData={initialData} />;
}
