import { unauthorized } from 'next/navigation';
import { auth } from '~/auth';

export async function requireUserSession(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) unauthorized();

  return userId;
}
