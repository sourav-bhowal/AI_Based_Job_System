import { cookies } from "next/headers";
import { getMe } from "./api-server"; // We'll update api-server to handle this
import type { User } from "./types";

export const SESSION_COOKIE_NAME = "auth_token";

/**
 * Gets the current auth token from HttpOnly cookies.
 */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Validates the token with backend and returns the User object for SSR.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const data = await getMe();
    return {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      created_at: data.created_at,
      is_admin: data.is_admin,
    };
  } catch (error) {
    // If the token is invalid or expired, return null.
    // We shouldn't delete the cookie here as it's a read operation,
    // layout/middleware will handle redirecting invalid sessions.
    return null;
  }
}
