import { NextRequest, NextResponse } from "next/server";
import { handleTagAddedWebhook } from "@/lib/sync/ghl-sync";

/**
 * POST /api/webhooks/ghl
 *
 * Receives GHL webhook events.
 * Configure this URL in GHL under Settings → Webhooks.
 * Handles: contact.tag_added
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type as string | undefined;

  if (eventType === "contact.tag_added" || eventType === "ContactTagUpdate") {
    const contactId = (body.contactId ?? body.id) as string | undefined;
    const tag = (body.tag ?? body.tagName) as string | undefined;
    const locationId = body.locationId as string | undefined;

    if (!contactId || !tag) {
      return NextResponse.json(
        { error: "Missing contactId or tag" },
        { status: 400 }
      );
    }

    await handleTagAddedWebhook({
      contactId,
      tag,
      locationId: locationId ?? process.env.GHL_LOCATION_ID ?? "",
    });
  }

  // Always return 200 so GHL doesn't retry
  return NextResponse.json({ received: true });
}
