import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import SlackProvider from 'next-auth/providers/slack';
import { getOrCreateSlackUser, linkUserToPlatform } from './lib/db/slack';
import { env } from './lib/env/server';

function getProviders() {
  const providers = [];

  // Add OpenID provider if configured
  if (env.AUTH_OPENID_ID && env.AUTH_OPENID_SECRET && env.AUTH_OPENID_ISSUER) {
    providers.push({
      id: 'default',
      name: 'OpenID',
      type: 'oidc',
      options: {
        clientId: env.AUTH_OPENID_ID,
        clientSecret: env.AUTH_OPENID_SECRET,
        issuer: env.AUTH_OPENID_ISSUER
      }
    } as const);
  } else {
    providers.push(
      Credentials({
        id: 'default',
        name: 'Local auth',
        async authorize() {
          return { id: 'local', name: 'User', email: 'user@localhost' };
        }
      })
    );
  }

  // Add Slack provider
  if (env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET) {
    providers.push(
      SlackProvider({
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
        // Request additional scopes for bot functionality
        authorization: {
          params: {
            scope: 'openid email profile identify chat:write channels:read im:history'
          }
        }
      })
    );
  }

  return providers;
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
    async signIn({ account, profile, user }) {
      if (account?.provider === 'slack' && profile) {
        try {
          // Create or update the Slack user record
          const slackUser = await getOrCreateSlackUser(
            profile.sub as string,
            profile.team_id as string,
            profile.email as string,
            profile.name as string
          );

          // Link the Slack user to the platform user
          if (user.id) {
            await linkUserToPlatform(slackUser!.id, user.id);
          }

          return true;
        } catch (error) {
          console.error('Error linking Slack user:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account, user, profile }) {
      // Initial sign-in
      if (account && user) {
        // Store Slack-specific data in the token if it's a Slack sign-in
        if (account.provider === 'slack' && profile) {
          return {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: Date.now() + (account.expires_in ?? 100) * 1000,
            user: {
              ...user,
              slackTeamId: profile.team_id,
              slackUserId: profile.sub
            }
          };
        }
        // Default token for other providers
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
      // @ts-expect-error Types don't match
      session.slackTeamId = token.slackTeamId;

      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    }
  }
});

export { auth, handlers, signIn, signOut };
