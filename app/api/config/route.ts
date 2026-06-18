import { NextResponse } from "next/server";
import { getPublicAccessConfig } from "@/lib/access-control";

export async function GET() {
  return NextResponse.json(getPublicAccessConfig());
}
