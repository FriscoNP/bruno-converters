import { NextRequest, NextResponse } from "next/server";
import { postmanToBruno } from "@usebruno/converters";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      sourceType?: string;
      rawInput?: string;
    };

    if (payload.sourceType !== "postman") {
      return NextResponse.json(
        { error: "Unsupported source type for server conversion." },
        { status: 400 },
      );
    }

    if (!payload.rawInput || typeof payload.rawInput !== "string") {
      return NextResponse.json(
        { error: "rawInput must be a non-empty string." },
        { status: 400 },
      );
    }

    const parsedInput = JSON.parse(payload.rawInput);
    const result = postmanToBruno(parsedInput);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to convert input.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
