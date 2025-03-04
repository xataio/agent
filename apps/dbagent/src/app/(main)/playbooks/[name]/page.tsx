import { notFound } from 'next/navigation';
import { PlaybookView } from '~/components/playbooks/playbook-view';
import { getPlaybookDetails } from '~/lib/tools/playbooks';

type PageParams = {
  name: string;
};

export default async function PlaybookPage({ params }: { params: Promise<PageParams> }) {
  const { name } = await params;
  const playbook = getPlaybookDetails(name);

  if (!playbook) {
    notFound();
  }

  return (
    <div className="container">
      <PlaybookView playbook={playbook} />
    </div>
  );
}
