import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    // Поддерживаем секрет из URL параметров или JSON body
    const secret = req.nextUrl.searchParams.get("secret");
    const body = await req.json().catch(() => ({}));
    const secretFromBody = body.secret;
    
    const validTokens = [process.env.REVALIDATE_TOKEN].filter(Boolean);
    
    if (!validTokens.includes(secret || '') && !validTokens.includes(secretFromBody || '')) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    
    // Поддерживаем один путь или массив путей
    const pathParam = req.nextUrl.searchParams.get("path");
    const pathsFromBody = body.paths || [];
    
    const pathsToRevalidate = pathsFromBody.length > 0 ? pathsFromBody : [pathParam || "/"];
    
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
