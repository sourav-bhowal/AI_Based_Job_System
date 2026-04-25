import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();

  const backendRes = await fetch(`${API_BASE}/api/reports/generate-match-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errText = await backendRes.text();
    return new Response(errText, { status: backendRes.status });
  }

  // Stream the PDF bytes straight through
  const pdfBytes = await backendRes.arrayBuffer();

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": backendRes.headers.get("Content-Disposition") || 'attachment; filename="match_report.pdf"',
    },
  });
}
