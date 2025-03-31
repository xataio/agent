import { notFound } from 'next/navigation';
import { actionGetCustomPlaybook } from '~/components/playbooks/action';
import { CustomPlaybookForm } from '~/components/playbooks/custom-playbook-form';

type PageParams = {
  project: string;
  playbook: string;
};

export default async function EditPlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { project, playbook: playbookId } = await params;

  // Then check custom playbooks
  const customPlaybook = await actionGetCustomPlaybook(project, playbookId);
  if (!customPlaybook) {
    notFound();
  }

  // Convert custom playbook to Playbook type for CustomPlaybookForm
  const customPlaybookForForm = {
    name: customPlaybook.name,
    description: customPlaybook.description,
    content: customPlaybook.content,
    isBuiltIn: false,
    id: customPlaybook.id
  };

  return <CustomPlaybookForm initialData={customPlaybookForForm} isEditing />;
}
