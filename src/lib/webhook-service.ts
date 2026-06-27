import { db } from "@/lib/db";

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhooks(payload: WebhookPayload) {
  try {
    const integrations = await db.integration.findMany({
      where: { isActive: true },
    });

    for (const integration of integrations) {
      try {
        const events: string[] = [];
        try { events.push(...JSON.parse(integration.events as string)); } catch {}

        if (!events.includes(payload.event) && !events.includes("*")) continue;

        const webhookUrl = integration.webhookUrl;
        if (!webhookUrl) continue;

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: payload.event,
            timestamp: new Date().toISOString(),
            source: "EMS",
            data: payload.data,
          }),
        });
      } catch (err) {
        console.error(`Webhook failed for ${integration.name}:`, err);
      }
    }
  } catch (error) {
    console.error("Error dispatching webhooks:", error);
  }
}