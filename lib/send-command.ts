const WEBHOOK_URL =
  "https://jonalo9576.app.n8n.cloud/webhook/69f4179a-0af0-49b0-aa63-928bc56edec9";

export async function sendCommand(command: Record<string, unknown>) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return await res.json();
}
