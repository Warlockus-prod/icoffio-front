/**
 * WordPress service is decommissioned.
 * This stub is kept for backward compatibility with legacy scripts/imports.
 */

export interface WordPressHealthStatus {
  available: false;
  authenticated: false;
  canCreatePosts: false;
  categoriesAvailable: false;
  details: {
    decommissioned: true;
  };
}

class WordPressServiceStub {
  private readonly message = 'WordPress integration disabled (decommissioned)';

  isAvailable(): Promise<false> {
    return Promise.resolve(false);
  }

  checkAuthentication(): Promise<false> {
    return Promise.resolve(false);
  }

  getHealthStatus(): Promise<WordPressHealthStatus> {
    return Promise.resolve({
      available: false,
      authenticated: false,
      canCreatePosts: false,
      categoriesAvailable: false,
      details: { decommissioned: true },
    });
  }

  async publishMultilingualArticle(): Promise<{
    success: false;
    summary: { total: 0; published: 0; failed: 0 };
    results: [];
    error: string;
  }> {
    return {
      success: false,
      summary: { total: 0, published: 0, failed: 0 },
      results: [],
      error: this.message,
    };
  }

  async getArticles(): Promise<{ success: false; articles: []; error: string }> {
    return { success: false, articles: [], error: this.message };
  }

  async deleteArticle(): Promise<{ success: false; error: string }> {
    return { success: false, error: this.message };
  }
}

export const wordpressService = new WordPressServiceStub();

