import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { env } from './lib/env/server';

function getProviders() {
  if (env.AUTH_OPENID_ID && env.AUTH_OPENID_SECRET && env.AUTH_OPENID_ISSUER) {
    return [
      {
        id: 'openid',
        name: 'OpenID',
        type: 'oidc',
        options: {
          clientId: env.AUTH_OPENID_ID,
          clientSecret: env.AUTH_OPENID_SECRET,
          issuer: env.AUTH_OPENID_ISSUER
        }
      } as const
    ];
  }

  return [
    Credentials({
      name: 'Local auth',
      async authorize() {
        return { id: '1', name: 'User', email: 'user@example.com' };
      }
    })
  ];
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: getProviders(),
  secret: env.AUTH_SECRET,
  session: {
    strategy: 'jwt'
  }
});
