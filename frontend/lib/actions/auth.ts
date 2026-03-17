"use server";

import { cookies } from "next/headers";
import { loginUserSSR, registerUserSSR } from "@/lib/api-server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Validates login via backend and sets HTTP cookie.
 */
export async function loginAction(
  prevState: any,
  formData: FormData
) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const res = await loginUserSSR(username, password);

    // Set HTTP Only Cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to log in",
    };
  }
}

/**
 * Registers user via backend and sets HTTP cookie.
 */
export async function registerAction(
  prevState: any,
  formData: FormData
) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  try {
    const res = await registerUserSSR(username, email, password, fullName);

    // Set HTTP Only Cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Registration failed",
    };
  }
}

/**
 * Destroys session cookie.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { success: true };
}
