import { notFound } from 'next/navigation';
import { PlaybookView } from '~/components/playbooks/playbook-view';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

type PageParams = {
  playbook: string;
};

export default async function PlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { playbook: playbookName } = await params;
  const playbook = getPlaybookDetails(playbookName);

  if (!playbook) {
    notFound();
  }

  return (
    <div className="container">
      <PlaybookView playbook={playbook} />
    </div>
  );
}
