// Default webhook URL
const DEFAULT_WEBHOOK_URL =
  "https://wokor81792atizkatdotcom.app.n8n.cloud/webhook/f6ff9251-e5dc-49c9-88d3-140722555e34";

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
