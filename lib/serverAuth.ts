import { cookies } from "next/headers";
import { getUserById, toPublicUser } from "@/lib/users";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const getSessionUser = async () => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = getUserById(session.userId);
  if (!user) return null;
  return toPublicUser(user);
};
