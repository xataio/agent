'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const session = useSession();
  const router = useRouter();

  const params = new URLSearchParams(window.location.search);
  const callbackUrl = params.get('callbackUrl');

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      void signIn('default').then(() => {
        if (callbackUrl) {
          router.push(callbackUrl);
        }
      });
    } else if (session.status === 'authenticated' && callbackUrl) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  return null;
}
