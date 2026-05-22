// Default webhook URL
// Previous: https://wokor81792atizkatdotcom.app.n8n.cloud/webhook/f6ff9251-e5dc-49c9-88d3-140722555e34
const DEFAULT_WEBHOOK_URL =
  "https://fifahis650atnrizadotcom.app.n8n.cloud/webhook/e0fc7d28-309a-4f33-a45e-a9548ac210a6";

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
  const url = getWebhookUrl();
  console.log("[v0] Sending command to webhook:", url, command);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      console.error(
        "[v0] Webhook returned status",
        res.status,
        res.statusText
      );
      throw new Error(
        `Webhook error: ${res.status} ${res.statusText}. Make sure the webhook URL is correct and the n8n workflow is running.`
      );
    }

    const data = await res.json();
    console.log("[v0] Webhook response:", data);
    return data;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error connecting to webhook";
    console.error("[v0] Webhook connection error:", message);
    throw new Error(message);
  }
}
