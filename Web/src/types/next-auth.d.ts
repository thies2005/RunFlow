import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            hasStrava: boolean;
            lastSyncAt: string | null;
            authMethod?: string;
            isAdmin?: boolean;
        } & DefaultSession["user"]
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
    }
}
