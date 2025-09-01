import type { Post, Category } from "./types";

const WP = process.env.NEXT_PUBLIC_WP_ENDPOINT || "https://admin.icoffio.com/graphql";

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
  if (!WP || WP === "undefined") {
    throw new Error("WordPress GraphQL endpoint not configured");
  }
  
  const res = await fetch(WP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 120 }, // ISR
  });
  
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  
  return json.data;
}

const strip = (s?: string) => (s || "").replace(/<[^>]+>/g, "").trim();

export async function getAllPosts(limit = 12): Promise<Post[]> {
  const q = `
    query($first:Int!){
      posts(first:$first, where:{orderby:{field:DATE, order:DESC}}){
        nodes{
          slug title excerpt date
          featuredImage{ node{ sourceUrl } }
          categories(first:1){ nodes{ name slug } }
        }
      }
    }`;
  const data = await gql<{posts:{nodes:any[]}}>(q, { first: limit });
  return data.posts.nodes.map(n => ({
    slug: n.slug,
    title: strip(n.title) || "Untitled",
    excerpt: strip(n.excerpt),
    date: n.date,
    publishedAt: n.date,
    image: n.featuredImage?.node?.sourceUrl || "",
    category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
    contentHtml: "",
  }));
}

export async function getTopPosts(limit = 1) { return getAllPosts(limit); }

export async function getAllSlugs(): Promise<string[]> {
  const q = `query{ posts(first: 1000){ nodes{ slug } } }`;
  const data = await gql<{posts:{nodes:{slug:string}[]}}>(q);
  return data.posts.nodes.map(n => n.slug);
}

export async function getPostBySlug(slug: string): Promise<Post|null> {
  const q1 = `query($slug:String!){
    postBy(slug:$slug){
      slug title content date
      featuredImage{ node{ sourceUrl } }
      categories{ nodes{ name slug } }
    } }`;
  const d1 = await gql<{postBy:any}>(q1, { slug });
  let p = d1.postBy;

  if (!p) {
    const q2 = `query($slug:ID!){
      post(id:$slug, idType: SLUG){
        slug title content date
        featuredImage{ node{ sourceUrl } }
        categories{ nodes{ name slug } }
      } }`;
    const d2 = await gql<{post:any}>(q2, { slug });
    p = d2.post;
  }
  if (!p) return null;

  return {
    slug: p.slug,
    title: strip(p.title),
    excerpt: "",
    date: p.date,
    publishedAt: p.date,
    image: p.featuredImage?.node?.sourceUrl || "",
    category: p.categories?.nodes?.[0] || { name: "General", slug: "general" },
    contentHtml: p.content || "",
  };
}

export async function getRelated(cat: Category, excludeSlug: string, limit = 4): Promise<Post[]> {
  const q = `
    query($first:Int!, $cat:String!){
      posts(first:$first, where:{categoryName:$cat, orderby:{field:DATE, order:DESC}}){
        nodes{
          slug title excerpt date
          featuredImage{ node{ sourceUrl } }
          categories{ nodes{ name slug } }
        }
      }
    }`;
  const d = await gql<{posts:{nodes:any[]}}>(q, { first: 20, cat: cat.slug });
  return d.posts.nodes
    .filter(n => n.slug != excludeSlug)
    .slice(0, limit)
    .map(n => ({
      slug: n.slug,
      title: strip(n.title),
      excerpt: strip(n.excerpt),
      date: n.date,
      publishedAt: n.date,
      image: n.featuredImage?.node?.sourceUrl || "",
      category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: "",
    }));
}

export async function getCategories(): Promise<Category[]> {
  const q = `query{ categories(first:100){ nodes{ name slug } } }`;
  const d = await gql<{categories:{nodes:Category[]}}>(q);
  return d.categories.nodes;
}

export async function getCategorySlugs(): Promise<string[]> {
  const cats = await getCategories();
  return cats.map(c => c.slug);
}

export async function getCategoryBySlug(slug: string): Promise<Category|null> {
  const cats = await getCategories();
  return cats.find(c => c.slug === slug) || null;
}

export async function getPostsByCategory(slug: string, limit = 24): Promise<Post[]> {
  const q = `
    query($first:Int!, $slug:String!){
      posts(first:$first, where:{categoryName:$slug, orderby:{field:DATE, order:DESC}}){
        nodes{
          slug title excerpt date
          featuredImage{ node{ sourceUrl } }
          categories{ nodes{ name slug } }
        }
      }
    }`;
  const d = await gql<{posts:{nodes:any[]}}>(q, { first: limit, slug });
  return d.posts.nodes.map(n => ({
    slug: n.slug,
    title: strip(n.title),
    excerpt: strip(n.excerpt),
    date: n.date,
    publishedAt: n.date,
    image: n.featuredImage?.node?.sourceUrl || "",
    category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
    contentHtml: "",
  }));
}
