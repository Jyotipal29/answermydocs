import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import * as jose from "jose";

let client: MongoClient | null = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI || "");
  }
  await client.connect();
  return client.db(process.env.MONGODB_DB || "answermydocs");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: credentials.email });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = await getDb();
        const existing = await db
          .collection("users")
          .findOne({ email: user.email });

        if (!existing) {
          await db.collection("users").insertOne({
            email: user.email,
            name: user.name || "",
            password: null,
            provider: "google",
            avatar: user.image || null,
            created_at: new Date().toISOString(),
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },
  jwt: {
    async encode({ token, secret }) {
      if (!token) return "";
      const secretKey = new TextEncoder().encode(secret as string);
      return await new jose.SignJWT(token as jose.JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);
    },
    async decode({ token, secret }) {
      if (!token) return null;
      try {
        const secretKey = new TextEncoder().encode(secret as string);
        const { payload } = await jose.jwtVerify(token, secretKey);
        return payload as ReturnType<typeof jose.decodeJwt>;
      } catch {
        return null;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
