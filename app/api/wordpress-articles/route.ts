import { NextResponse } from 'next/server';

const WORDPRESS_GRAPHQL = 'https://icoffio.com/graphql';

export async function GET() {
  try {
    const query = {
      query: `
        query {
          posts(first: 100) {
            nodes {
              title
              slug  
              excerpt
              content
              date
              categories {
                nodes {
                  name
                  slug
                }
              }
              featuredImage {
                node {
                  sourceUrl
                }
              }
            }
          }
        }
      `
    };

    const response = await fetch(WORDPRESS_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store' // Всегда свежие данные
    });

    if (!response.ok) {
      throw new Error(`WordPress GraphQL failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const articles = data.data.posts.nodes.map((post: any) => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      date: post.date,
      categories: post.categories,
      image: post.featuredImage?.node?.sourceUrl || ''
    }));

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
      message: `Загружено ${articles.length} статей из WordPress`
    });

  } catch (error) {
    console.error('WordPress articles API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      articles: [],
      count: 0
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, articleSlugs } = body;

    if (action === 'translate-selected') {
      // Перевод выбранных статей
      const query = {
        query: `
          query($slugs: [String!]!) {
            posts(where: { slugIn: $slugs }) {
              nodes {
                title
                slug
                excerpt  
                content
                categories { nodes { name } }
              }
            }
          }
        `,
        variables: { slugs: articleSlugs }
      };

      const wpResponse = await fetch(WORDPRESS_GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      const wpData = await wpResponse.json();
      const selectedArticles = wpData.data.posts.nodes;

      return NextResponse.json({
        success: true,
        articles: selectedArticles,
        message: `Подготовлено ${selectedArticles.length} статей для перевода`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие'
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}













