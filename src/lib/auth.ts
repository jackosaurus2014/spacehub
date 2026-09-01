import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from './db';
import { lockedFor, recordFailure, recordSuccess } from './login-throttle';

// How often a live JWT re-checks the database for a password change
// (2026-09-01 hardening, L2). Sessions are stateless JWTs with a 30-day
// default lifetime, so without this a stolen session survived a reset.
const PASSWORD_EPOCH_RECHECK_MS = 5 * 60 * 1000;

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

      // Per-account lockout (H2). Checked before the DB read so a locked
      // account costs nothing to reject.
      const lockSeconds = lockedFor(credentials.email);
      if (lockSeconds > 0) {
        throw new Error(`Too many sign-in attempts. Try again in ${Math.ceil(lockSeconds / 60)} minutes.`);
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        // Count unknown-email guesses too, so the response cost is uniform.
        recordFailure(credentials.email);
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password
      );

      if (!isPasswordValid) {
        recordFailure(credentials.email);
        throw new Error('Invalid credentials');
      }
      recordSuccess(credentials.email);

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
        // G6 (2026-09-01): lastLoginAt existed in the schema but nothing ever
        // wrote it (winback had to fall back to updatedAt). Keyed by email —
        // unique, and correct even when OAuth hands us a provider subject id.
        if (user.email) {
          prisma.user.update({ where: { email: user.email }, data: { lastLoginAt: new Date() } })
            .catch(() => { /* best-effort telemetry — never block sign-in */ });
        }
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

      // Password-change epoch (L2): every few minutes, compare the token's
      // issue time against User.passwordChangedAt. A reset or change after
      // this token was minted invalidates it; the user signs in again.
      const now = Date.now();
      const lastCheck = (token.pwCheckedAt as number | undefined) ?? 0;
      if (token.id && !user && now - lastCheck > PASSWORD_EPOCH_RECHECK_MS) {
        token.pwCheckedAt = now;
        try {
          const row = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChangedAt: true },
          });
          const iatMs = typeof token.iat === 'number' ? token.iat * 1000 : 0;
          if (row?.passwordChangedAt && row.passwordChangedAt.getTime() > iatMs) {
            token.revoked = true;
          }
        } catch {
          // DB hiccup: keep the token; the next recheck will catch up.
        }
      }
      if (user) token.pwCheckedAt = now;

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        // Sessions are JWTs: we cannot delete them, but we can refuse to
        // hydrate one. Every `session?.user?.id` gate then fails closed.
        return { ...session, user: undefined as unknown as typeof session.user, expires: new Date(0).toISOString() };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin ?? false) as boolean;
      }
      return session;
    },
  },
};
