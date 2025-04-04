import { actionGetCustomPlaybook } from '~/components/playbooks/action';
import { CustomPlaybookForm } from '~/components/playbooks/custom-playbook-form';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

export default async function NewPlaybookPage({
  params,
  searchParams
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ playbookName?: string; customPlaybookId?: string }>;
}) {
  const { project } = await params;
  const { playbookName, customPlaybookId } = await searchParams;
  let initialData;

  try {
    if (playbookName) {
      const builtInPlaybook = getPlaybookDetails(playbookName);
      if (builtInPlaybook) {
        initialData = {
          name: `${builtInPlaybook.name} (Copy)`,
          description: builtInPlaybook.description,
          content: builtInPlaybook.content,
          isBuiltIn: true
        };
      }
    } else if (customPlaybookId) {
      const customPlaybook = await actionGetCustomPlaybook(project, customPlaybookId);
      if (customPlaybook) {
        initialData = {
          name: `${customPlaybook.name} (Copy)`,
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
