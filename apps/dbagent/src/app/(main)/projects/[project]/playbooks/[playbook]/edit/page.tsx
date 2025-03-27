import { notFound } from 'next/navigation';
import { CustomPlaybookForm } from '~/components/playbooks/custom-playbook-form';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

type PageParams = {
  project: string;
  playbook: string;
};

export default async function EditPlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { playbook: playbookName } = await params;
  const playbook = getPlaybookDetails(playbookName);

  if (!playbook || playbook.isBuiltIn) {
    // Built-in playbooks cannot be edited
    notFound();
  }

  return <CustomPlaybookForm initialData={playbook} isEditing />;
}
