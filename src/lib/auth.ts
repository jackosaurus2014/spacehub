import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from './db';

// OAuth providers are only registered when their credentials are configured,
// so the app works unchanged until the env vars are set.
export const isGoogleAuthEnabled = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const isMicrosoftAuthEnabled = () =>
  Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);

const OAUTH_PROVIDER_IDS = ['google', 'azure-ad'];

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Invalid credentials');
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Email verification is encouraged but not required for login.
      // Users who haven't verified will see a reminder banner instead of being blocked.

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      };
    },
  }),
];

if (isGoogleAuthEnabled()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })
  );
}

if (isMicrosoftAuthEnabled()) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID as string,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
      tenantId: 'common', // personal + work/school Microsoft accounts
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Credentials logins are fully handled in authorize() above.
      if (!account || !OAUTH_PROVIDER_IDS.includes(account.provider)) {
        return true;
      }

      // OAuth logins must provide a verified email we can key the account on.
      if (!user.email) {
        return false;
      }

      try {
        // Upsert by email. Linking to an existing credentials account by email
        // is safe here because Google and Microsoft verify email ownership.
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            // The IdP has verified this address; don't overwrite an existing
            // user's chosen name or other profile fields.
            emailVerified: true,
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            // The schema requires a password; store an unguessable random hash
            // so credentials login can never succeed for OAuth-created accounts
            // until the user explicitly sets a password via reset.
            password: await bcrypt.hash(randomUUID(), 12),
            emailVerified: true,
            subscriptionTier: 'free',
          },
        });
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }

      // For OAuth sign-ins, `user.id` is the provider's subject id, not our
      // DB id. Fetch the DB user (upserted in signIn above) so the token
      // carries the same fields as a credentials login.
      if (account && OAUTH_PROVIDER_IDS.includes(account.provider)) {
        const email = user?.email ?? token.email;
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, isAdmin: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.isAdmin = dbUser.isAdmin;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin ?? false) as boolean;
      }
      return session;
    },
  },
};
