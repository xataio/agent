import { ConnectionForm } from '~/components/connections/connection-form';

export default async function EditConnection({ params }: { params: Promise<{ connection: string }> }) {
  const { connection } = await params;
  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Edit Connection</h1>
      <ConnectionForm id={connection} />
    </div>
  );
}
