import { NextResponse } from 'next/server';
import { getAllPosts, getTopPosts, getCategories } from '@/lib/data';
import { getPopularArticles } from '@/lib/supabase-analytics';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint для проверки данных главной страницы
 * GET /api/debug/homepage-data?locale=en
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';
  
  const results: any = {
    locale,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // 1. Check GraphQL - Top Posts (Hero)
  try {
    const heroPosts = await getTopPosts(3);
    results.checks.graphqlTopPosts = {
      status: 'ok',
      count: heroPosts?.length || 0,
      posts: heroPosts?.map(p => ({ slug: p.slug, title: p.title?.substring(0, 50) })) || []
    };
  } catch (error: any) {
    results.checks.graphqlTopPosts = {
      status: 'error',
      error: error.message
    };
  }

  // 2. Check GraphQL - All Posts
  try {
    const allPosts = await getAllPosts(20, locale);
    results.checks.graphqlAllPosts = {
      status: 'ok',
      count: allPosts?.length || 0,
      posts: allPosts?.slice(0, 5).map(p => ({ slug: p.slug, title: p.title?.substring(0, 50) })) || []
    };
  } catch (error: any) {
    results.checks.graphqlAllPosts = {
      status: 'error',
      error: error.message
    };
  }

  // 3. Check Supabase - Popular Articles
  try {
    const popularSlugs = await getPopularArticles(10, locale);
    results.checks.supabasePopular = {
      status: 'ok',
      count: popularSlugs?.length || 0,
      slugs: popularSlugs || []
    };
  } catch (error: any) {
    results.checks.supabasePopular = {
      status: 'error',
      error: error.message
    };
  }

  // 4. Check Categories
  try {
    const categories = await getCategories(locale);
    results.checks.categories = {
      status: 'ok',
      count: categories?.length || 0,
      names: categories?.map(c => c.name) || []
    };
  } catch (error: any) {
    results.checks.categories = {
      status: 'error',
      error: error.message
    };
  }

  // Summary
  const allOk = Object.values(results.checks).every((c: any) => c.status === 'ok');
  results.summary = {
    allChecksOk: allOk,
    hasRealData: 
      (results.checks.graphqlAllPosts?.count > 0) || 
      (results.checks.supabasePopular?.count > 0),
    recommendation: !allOk 
      ? 'Some data sources are failing - using fallback mock data'
      : (results.checks.graphqlAllPosts?.count === 0 && results.checks.supabasePopular?.count === 0)
        ? 'No real articles found - showing mock data'
        : 'Real data available'
  };

  return NextResponse.json(results, { status: 200 });
}




