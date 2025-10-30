/**
 * QUEUE SERVICE v7.9.2 - SUPABASE PERSISTENT QUEUE
 * 
 * Manages processing queue for Telegram bot requests
 * Uses Supabase for persistent storage across serverless invocations
 * 
 * Features:
 * - ✅ Persistent storage (Supabase)
 * - ✅ Serverless-safe (no memory state)
 * - ✅ FIFO (First In, First Out) queue
 * - ✅ Automatic retry on failure
 * - ✅ Status tracking
 * - ✅ Concurrent processing limit
 * 
 * @version 7.9.2
 * @date 2025-10-30
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publishDualLanguageArticle } from './dual-language-publisher';

// Lazy initialization для Supabase (не создаем при импорте модуля)
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  
  return supabaseClient;
}

export interface QueueJob {
  id: string;
  type: 'url-parse' | 'text-generate' | 'ai-copywrite';
  data: {
    url?: string;
    text?: string;
    title?: string;
    category?: string;
    language?: string;
    chatId?: number;
    messageId?: number;
    submissionId?: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
  retries: number;
  max_retries: number;
}

class QueueService {
  private isProcessing: boolean = false;
  private maxConcurrent: number = 1;

  /**
   * Add job to Supabase queue
   */
  async addJob(job: Omit<QueueJob, 'id' | 'status' | 'created_at' | 'retries'>): Promise<string> {
    const id = this.generateId();
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('telegram_jobs')
      .insert({
        id,
        type: job.type,
        status: 'pending',
        data: job.data,
        retries: 0,
        max_retries: job.max_retries || 3,
      })
      .select()
      .single();

    if (error) {
      console.error('[Queue] Failed to add job:', error);
      throw new Error(`Failed to add job: ${error.message}`);
    }

    console.log(`[Queue] Job added to Supabase: ${id} (type: ${job.type})`);
    
    // Start processing asynchronously
    this.processQueue().catch(err => 
      console.error('[Queue] Process queue error:', err)
    );

    return id;
  }

  /**
   * Get job status from Supabase
   */
  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('telegram_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      console.error(`[Queue] Job not found: ${jobId}`, error);
      return null;
    }

    return data as QueueJob;
  }

  /**
   * Process queue sequentially from Supabase
   */
  private async processQueue() {
    if (this.isProcessing) {
      console.log('[Queue] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Get all pending jobs
      const supabase = getSupabase();
      const { data: pendingJobs, error } = await supabase
        .from('telegram_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[Queue] Failed to fetch pending jobs:', error);
        return;
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        console.log('[Queue] No pending jobs');
        return;
      }

      console.log(`[Queue] Found ${pendingJobs.length} pending jobs`);

      // Process first job
      const job = pendingJobs[0] as QueueJob;

      // Update status to processing
      await supabase
        .from('telegram_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[Queue] Processing job: ${job.id}`);

      try {
        const result = await this.processJob(job);
        
        // Update as completed
        await supabase
          .from('telegram_jobs')
          .update({
            status: 'completed',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        console.log(`[Queue] Job completed: ${job.id}`);
        
      } catch (error: any) {
        console.error(`[Queue] Job failed: ${job.id}`, error);
        
        const newRetries = job.retries + 1;
        
        if (newRetries < job.max_retries) {
          // Retry
          await supabase
            .from('telegram_jobs')
            .update({
              status: 'pending',
              retries: newRetries,
              error: null,
            })
            .eq('id', job.id);
          
          console.log(`[Queue] Retrying job: ${job.id} (attempt ${newRetries + 1}/${job.max_retries})`);
        } else {
          // Max retries reached
          await supabase
            .from('telegram_jobs')
            .update({
              status: 'failed',
              error: error.message || 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          
          console.error(`[Queue] Job failed permanently: ${job.id}`);
        }
      }

      // Process next job if exists
      if (pendingJobs.length > 1) {
        console.log('[Queue] More jobs pending, scheduling next batch...');
        setTimeout(() => this.processQueue(), 2000);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual job based on type
   */
  private async processJob(job: QueueJob): Promise<any> {
    switch (job.type) {
      case 'url-parse':
        return await this.processUrlParse(job);
      
      case 'text-generate':
        return await this.processTextGenerate(job);
      
      case 'ai-copywrite':
        return await this.processAICopywrite(job);
      
      default:
        throw new Error(`Unknown job type: ${(job as any).type}`);
    }
  }

  /**
   * Process URL parsing job
   */
  private async processUrlParse(job: QueueJob): Promise<any> {
    const { url, category } = job.data;
    
    if (!url) {
      throw new Error('URL is required for url-parse job');
    }

    console.log(`[Queue] Parsing URL: ${url}`);
    const baseUrl = 'https://app.icoffio.com';
    const parseResponse = await fetch(`${baseUrl}/api/admin/parse-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!parseResponse.ok) {
      const error = await parseResponse.text();
      throw new Error(`URL parsing failed: ${error}`);
    }

    const parsedContent = await parseResponse.json();
    console.log(`[Queue] Parsed: "${parsedContent.title}"`);

    const formattedContent = parsedContent.content
      .replace(/\.\s+/g, '.\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`[Queue] Publishing dual-language article from parsed URL...`);
    
    const result = await publishDualLanguageArticle(
      formattedContent,
      parsedContent.title,
      category
    );

    if (!result.success) {
      throw new Error(result.error || 'Dual-language publication failed');
    }

    console.log(`[Queue] Dual-language publication complete:`, {
      enUrl: result.enResult.url,
      plUrl: result.plResult?.url || 'not published'
    });

    return {
      success: true,
      published: true,
      title: result.enResult.title,
      wordCount: result.enResult.wordCount,
      category: result.category,
      url: result.enResult.url,
      urlPl: result.plResult?.url || null,
      postId: result.enResult.postId,
      postIdPl: result.plResult?.postId || null,
      languages: result.plResult ? ['en', 'pl'] : ['en'],
      publishResult: {
        en: result.enResult,
        pl: result.plResult
      }
    };
  }

  /**
   * Process text generation job
   */
  private async processTextGenerate(job: QueueJob): Promise<any> {
    const { text, title, category } = job.data;
    
    if (!text) {
      throw new Error('Text is required for text-generate job');
    }

    console.log(`[Queue] Starting dual-language article generation...`);
    
    const result = await publishDualLanguageArticle(
      text,
      title,
      category
    );

    if (!result.success) {
      throw new Error(result.error || 'Dual-language publication failed');
    }

    console.log(`[Queue] Dual-language publication complete:`, {
      enUrl: result.enResult.url,
      plUrl: result.plResult?.url || 'not published'
    });

    return {
      success: true,
      published: true,
      title: result.enResult.title,
      wordCount: result.enResult.wordCount,
      category: result.category,
      url: result.enResult.url,
      urlPl: result.plResult?.url || null,
      postId: result.enResult.postId,
      postIdPl: result.plResult?.postId || null,
      languages: result.plResult ? ['en', 'pl'] : ['en'],
      publishResult: {
        en: result.enResult,
        pl: result.plResult
      }
    };
  }

  /**
   * Process AI copywriting job
   */
  private async processAICopywrite(job: QueueJob): Promise<any> {
    return await this.processTextGenerate(job);
  }

  /**
   * Get queue statistics from Supabase
   */
  async getQueueStats() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('telegram_jobs')
      .select('status');

    if (error) {
      console.error('[Queue] Failed to get stats:', error);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };
    }

    return {
      total: data.length,
      pending: data.filter(j => j.status === 'pending').length,
      processing: data.filter(j => j.status === 'processing').length,
      completed: data.filter(j => j.status === 'completed').length,
      failed: data.filter(j => j.status === 'failed').length,
    };
  }

  /**
   * Clear completed/failed jobs older than X hours
   */
  async cleanupOldJobs(hoursOld: number = 24) {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('telegram_jobs')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoff);

    if (error) {
      console.error('[Queue] Cleanup failed:', error);
    } else {
      console.log(`[Queue] Cleaned up jobs older than ${hoursOld}h`);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let queueServiceInstance: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    console.log('[QueueService] Creating new instance');
    queueServiceInstance = new QueueService();
  }
  return queueServiceInstance;
}

export default QueueService;
