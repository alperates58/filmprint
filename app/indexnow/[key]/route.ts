import { getIndexNowConfig } from "@/lib/growth/indexnow/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!key) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Support both /indexnow/{key}.txt and /indexnow/{key}
  const cleanKey = key.endsWith(".txt") ? key.slice(0, -4) : key;

  try {
    const config = await getIndexNowConfig();

    if (!config.enabled || !config.key) {
      return new Response("IndexNow is inactive", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (config.key !== cleanKey) {
      return new Response("Invalid IndexNow key", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Return the key as plain text (IndexNow protocol requirement)
    return new Response(config.key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new Response("Internal Error", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
