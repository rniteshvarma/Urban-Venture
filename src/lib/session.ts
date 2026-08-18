import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Returns the signed-in user's id, or null. Never trust a client-supplied id. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
