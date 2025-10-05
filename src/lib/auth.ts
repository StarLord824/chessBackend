import { betterAuth } from "better-auth";
// import {prisma} from '../Singleton'
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

export const auth = betterAuth({
    trustedOrigins: [
        'https://example.com/dashboard', 
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,

    },
    socialProviders: {
        google: {
            enabled: true,
            clientId: (() => {
                // try {
                    if (!process.env.AUTH_GOOGLE_ID) throw new Error("Missing AUTH_GOOGLE_ID environment variable");
                    return process.env.AUTH_GOOGLE_ID;
                // } catch (error) {
                //     console.error(error);
                // } finally {
                //     return "";
                // }
            })(),
            clientSecret: (() => {
                // try {
                    if (!process.env.AUTH_GOOGLE_SECRET) throw new Error("Missing AUTH_GOOGLE_SECRET environment variable");
                    return process.env.AUTH_GOOGLE_SECRET;
                // } catch (error) {
                //     console.error(error);
                // } finally {
                //     return "";
                // }
            })(),
            // redirectURI: process.env.AUTH_GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",
        },
    }
  //...
});