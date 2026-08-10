import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.set(sessionCookieName, "", { path: "/", maxAge: 0 });
  return res;
}
