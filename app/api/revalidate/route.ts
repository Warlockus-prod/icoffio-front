import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
  const path = req.nextUrl.searchParams.get("path") || "/";
  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
