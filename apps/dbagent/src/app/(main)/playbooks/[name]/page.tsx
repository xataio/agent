import { notFound } from 'next/navigation';
import { PlaybookView } from '~/components/playbooks/playbook-view';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

export default function PlaybookPage({ params }: { params: { name: string } }) {
  const playbook = getPlaybookDetails(params.name);

  if (!playbook) {
    notFound();
  }

  return (
    <div className="container">
      <PlaybookView playbook={playbook} />
    </div>
  );
}
