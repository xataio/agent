'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signIn, useSession } from '~/components/auth/react';

export default function Page() {
  const session = useSession();
  const router = useRouter();

  const params = new URLSearchParams(window.location.search);
  const callbackUrl = params.get('callbackUrl');

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      signIn('default');
    } else if (session.status === 'authenticated' && callbackUrl) {
      router.push(callbackUrl);
    }
  }, [session]);

  return null;
}
