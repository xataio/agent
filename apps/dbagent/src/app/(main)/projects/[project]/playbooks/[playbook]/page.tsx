import { notFound } from 'next/navigation';
import { actionGetCustomPlaybooks } from '~/components/playbooks/action';
import { PlaybookView } from '~/components/playbooks/playbook-view';
import { getBuiltInPlaybooks } from '~/lib/tools/playbooks';

type PageParams = {
  project: string;
  playbook: string;
};

export default async function PlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { playbook: playbookId } = await params;

  // First check if it's a built-in playbook
  const builtInPlaybook = getBuiltInPlaybooks().find((p) => p.name === playbookId);
  if (builtInPlaybook) {
    return (
      <div className="container">
        <PlaybookView playbook={builtInPlaybook} />
      </div>
    );
  }

  // Then check custom playbooks
  const customPlaybooks = await actionGetCustomPlaybooks((await params).project);
  const customPlaybook = customPlaybooks.find((p) => p.id === playbookId);

  if (!customPlaybook) {
    notFound();
  }

  // Convert custom playbook to Playbook type for PlaybookView
  const customPlaybookForView = {
    name: customPlaybook.name,
    description: customPlaybook.description,
    content: customPlaybook.content,
    isBuiltIn: false
  };

  return (
    <div className="container">
      <PlaybookView playbook={customPlaybookForView} />
    </div>
  );
}
