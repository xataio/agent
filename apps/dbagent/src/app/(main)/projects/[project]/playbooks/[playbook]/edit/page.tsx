import { notFound } from 'next/navigation';
import { actionGetPlaybookByName } from '~/components/playbooks/action';
import { CustomPlaybookForm } from '~/components/playbooks/custom-playbook-form';

type PageParams = {
  project: string;
  playbook: string;
};

export default async function EditPlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { project, playbook: playbookName } = await params;
  const playbook = await actionGetPlaybookByName(playbookName, project);

  if (!playbook || playbook.isBuiltIn) {
    // Built-in playbooks cannot be edited
    notFound();
  }

  return <CustomPlaybookForm initialData={playbook} isEditing />;
}
