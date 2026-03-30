// Default webhook URL
const DEFAULT_WEBHOOK_URL =
  "https://jonalo9576.app.n8n.cloud/webhook/69f4179a-0af0-49b0-aa63-928bc56edec9";

const STORAGE_KEY = "n8n_webhook_url";

export function getWebhookUrl(): string {
  if (typeof window === "undefined") return DEFAULT_WEBHOOK_URL;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBHOOK_URL;
}

export function setWebhookUrl(url: string): void {
  if (typeof window === "undefined") return;
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getDefaultWebhookUrl(): string {
  return DEFAULT_WEBHOOK_URL;
}

export async function sendCommand(command: Record<string, unknown>) {
  const res = await fetch(getWebhookUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  return await res.json();
}
