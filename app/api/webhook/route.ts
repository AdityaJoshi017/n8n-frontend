import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://jonalo9576.app.n8n.cloud/webhook/69f4179a-0af0-49b0-aa63-928bc56edec9";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Webhook proxy error:", error);
    return NextResponse.json(
      { error: "Failed to forward request to n8n webhook" },
      { status: 500 }
    );
  }
}
