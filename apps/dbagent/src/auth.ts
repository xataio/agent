import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { env } from './lib/env/server';

function getProviders() {
  if (env.AUTH_OPENID_ID && env.AUTH_OPENID_SECRET && env.AUTH_OPENID_ISSUER) {
    return [
      {
        id: 'default',
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
      id: 'default',
      name: 'Local auth',
      async authorize() {
        return { id: 'local', name: 'User', email: 'user@localhost' };
      }
    })
  ];
}

const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/signin'
  },
  providers: getProviders(),
  secret: env.AUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign-in
      if (account && user) {
        return {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: Date.now() + (account.expires_in ?? 100) * 1000,
          user
        };
      }

      return token;
    },
    async session({ session, token }) {
      // @ts-expect-error Types don't match
      session.user = token.user;
      // @ts-expect-error Types don't match
      session.token = {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
        refreshToken: token.refreshToken
      };
      // @ts-expect-error Types don't match
      session.error = token.error;

      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    }
  }
});

export { auth, handlers, signIn, signOut };
