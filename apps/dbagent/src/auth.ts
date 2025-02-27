import NextAuth from 'next-auth';
import { env } from './lib/env/server';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: 'openid',
      name: 'OpenID',
      type: 'oidc',
      options: {
        clientId: env.AUTH_OPENID_ID,
        clientSecret: env.AUTH_OPENID_SECRET,
        issuer: env.AUTH_OPENID_ISSUER
      }
    }
  ],
  secret: env.AUTH_SECRET,
  session: {
    strategy: 'jwt'
  }
});
