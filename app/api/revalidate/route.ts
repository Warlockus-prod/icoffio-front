import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function getValidRevalidateTokens(): string[] {
  const rawTokens = [
    process.env.REVALIDATE_TOKEN,
    process.env.REVALIDATE_SECRET,
  ]
    .filter(Boolean)
    .join(",");

  return rawTokens
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractRequestedPaths(req: NextRequest, body: any): string[] {
  const pathParam = req.nextUrl.searchParams.get("path");
  const bodyPaths: unknown[] = Array.isArray(body?.paths) ? body.paths : [];
  const source: unknown[] = bodyPaths.length > 0 ? bodyPaths : [pathParam || "/"];

  return source
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("/") && !item.startsWith("//"))
    .slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validTokens = getValidRevalidateTokens();
    const providedSecret =
      req.nextUrl.searchParams.get("secret") ||
      body.secret ||
      req.headers.get("x-revalidate-token") ||
      "";

    if (validTokens.length === 0 && process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Revalidation token is not configured" }, { status: 503 });
    }

    if (validTokens.length > 0 && !validTokens.includes(String(providedSecret))) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const pathsToRevalidate = extractRequestedPaths(req, body);
    if (pathsToRevalidate.length === 0) {
      return NextResponse.json({ message: "No valid paths provided" }, { status: 400 });
    }

    // Ревалидируем все указанные пути
    const results = [];
    for (const path of pathsToRevalidate) {
      try {
        revalidatePath(path);
        results.push({ path, status: 'success' });
        console.log(`✅ Revalidated: ${path}`);
      } catch (error) {
        results.push({ path, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        console.error(`❌ Revalidation failed for ${path}:`, error);
      }
    }
    
    return NextResponse.json({ 
      revalidated: true, 
      results,
      message: `Revalidated ${results.filter(r => r.status === 'success').length}/${results.length} paths`
    });
    
  } catch (error) {
    console.error('Revalidation API error:', error);
    return NextResponse.json(
      { 
        message: "Revalidation failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
