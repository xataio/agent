import { redirect } from 'next/navigation';
import { generateUUID } from '~/components/chat/utils';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project } = await params;
  redirect(`/projects/${project}/chats/${generateUUID()}`);
}
