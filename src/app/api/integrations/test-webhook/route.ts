import { NextRequest, NextResponse } from "next/server";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { webhookUrl, provider } = await req.json();

    if (!webhookUrl) {
      return NextResponse.json(
        { message: "webhookUrl is required" },
        { status: 400 }
      );
    }

    const payload = {
      text: "EMS Test - Connection successful",
      timestamp: new Date().toISOString(),
      source: "employee-panel",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return NextResponse.json({
        success: true,
        statusCode: response.status,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);

      const aborted =
        fetchError instanceof DOMException && fetchError.name === "AbortError";

      return NextResponse.json({
        success: false,
        error: aborted ? "Request timed out after 5 seconds" : "Failed to connect to webhook URL",
      });
    }
  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}