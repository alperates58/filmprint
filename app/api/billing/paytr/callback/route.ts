import { NextRequest, NextResponse } from "next/server";
import { handlePaytrCallback } from "@/lib/billing/service";
import { PaytrCallbackPayload } from "@/lib/billing/paytr/types";

export async function POST(req: NextRequest) {
  try {
    let payload: Partial<PaytrCallbackPayload> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        (payload as any)[key] = value.toString();
      });
    } else {
      payload = await req.json().catch(() => ({}));
    }

    if (!payload.merchant_oid || !payload.status || !payload.total_amount || !payload.hash) {
      console.error("[PayTR Callback Missing Fields]:", payload);
      return new NextResponse("FAIL", { status: 400 });
    }

    const result = await handlePaytrCallback(payload as PaytrCallbackPayload);

    if (result.output === "OK") {
      return new NextResponse("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new NextResponse("FAIL", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("[PayTR Callback Unexpected Error]:", error);
    return new NextResponse("FAIL", { status: 500 });
  }
}