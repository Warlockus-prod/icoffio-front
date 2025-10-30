/**
 * QUEUE SERVICE v7.9.3 - SUPABASE WITH IN-MEMORY FALLBACK
 * 
 * Manages processing queue for Telegram bot requests
 * Uses Supabase for persistent storage with graceful fallback to in-memory
 * 
 * Features:
 * - ✅ Persistent storage (Supabase) when available
 * - ✅ In-memory fallback if Supabase fails
 * - ✅ Serverless-safe
 * - ✅ FIFO queue
 * - ✅ Automatic retry
 * 
 * @version 7.9.3
 * @date 2025-10-30
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publishDualLanguageArticle } from './dual-language-publisher';

/**
 * Send Telegram notification
 */
async function sendTelegramNotification(chatId: number, message: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('[Queue] TELEGRAM_BOT_TOKEN not configured');
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('[Queue] Failed to send Telegram notification:', await response.text());
    } else {
      console.log(`[Queue] Telegram notification sent to chat ${chatId}`);
    }
  } catch (error) {
    console.error('[Queue] Error sending Telegram notification:', error);
  }
}

// Lazy initialization для Supabase
let supabaseClient: SupabaseClient | null = null;
let supabaseAvailable: boolean = true;

function getSupabase(): SupabaseClient | null {
  if (!supabaseAvailable) return null;
  
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Queue] Supabase not configured, using in-memory queue');
      supabaseAvailable = false;
      return null;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      console.log('[Queue] Supabase client initialized');
    } catch (error) {
      console.error('[Queue] Failed to initialize Supabase:', error);
      supabaseAvailable = false;
      return null;
    }
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
  private memoryQueue: QueueJob[] = []; // Fallback in-memory queue
  private isProcessing: boolean = false;
  private maxConcurrent: number = 1;

  /**
   * Add job to queue (Supabase or memory)
   */
  async addJob(job: Omit<QueueJob, 'id' | 'status' | 'created_at' | 'retries'>): Promise<string> {
    const id = this.generateId();
    const supabase = getSupabase();
    
    // Try Supabase first
    if (supabase) {
      try {
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

        if (!error) {
          console.log(`[Queue] Job added to Supabase: ${id}`);
          this.processQueue().catch(err => 
            console.error('[Queue] Process queue error:', err)
          );
          return id;
        }
        
        console.error('[Queue] Supabase insert failed:', error);
      } catch (err) {
        console.error('[Queue] Supabase error:', err);
      }
    }
    
    // Fallback to in-memory
    console.log(`[Queue] Using in-memory queue for: ${id}`);
    const newJob: QueueJob = {
      id,
      type: job.type,
      data: job.data,
      status: 'pending',
      created_at: new Date().toISOString(),
      retries: 0,
      max_retries: job.max_retries || 3,
    };
    
    this.memoryQueue.push(newJob);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return id;
  }

  /**
   * Get job status (Supabase or memory)
   */
  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    const supabase = getSupabase();
    
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('telegram_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (!error && data) {
          return data as QueueJob;
        }
      } catch (err) {
        console.error('[Queue] Supabase getJobStatus error:', err);
      }
    }
    
    // Fallback to memory
    return this.memoryQueue.find(j => j.id === jobId) || null;
  }

  /**
   * Process queue (Supabase or memory)
   */
  public async processQueue() {
    if (this.isProcessing) {
      console.log('[Queue] Already processing, scheduling retry in 3s');
      setTimeout(() => this.processQueue(), 3000);
      return;
    }

    this.isProcessing = true;
    console.log('[Queue] Starting queue processing...');

    try {
      const supabase = getSupabase();
      
      // Try Supabase first
      if (supabase) {
        try {
          const { data: pendingJobs, error } = await supabase
            .from('telegram_jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10);

          if (error) {
            console.error('[Queue] Supabase query error:', error);
          } else if (pendingJobs && pendingJobs.length > 0) {
            console.log(`[Queue] Found ${pendingJobs.length} pending jobs in Supabase`);
            await this.processSupabaseJob(pendingJobs[0] as QueueJob);
            
            // Continue processing remaining jobs
            this.isProcessing = false;
            if (pendingJobs.length > 1) {
              setTimeout(() => this.processQueue(), 1000);
            }
            return;
          } else {
            console.log('[Queue] No pending jobs in Supabase');
          }
        } catch (err) {
          console.error('[Queue] Supabase processQueue error:', err);
        }
      }
      
      // Fallback to memory
      const job = this.memoryQueue.find(j => j.status === 'pending');
      if (job) {
        console.log(`[Queue] Processing memory job: ${job.id}`);
        await this.processMemoryJob(job);
        
        // Continue processing remaining jobs
        this.isProcessing = false;
        if (this.memoryQueue.some(j => j.status === 'pending')) {
          setTimeout(() => this.processQueue(), 1000);
        }
        return;
      } else {
        console.log('[Queue] No pending jobs in memory');
      }
    } catch (err) {
      console.error('[Queue] processQueue critical error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process Supabase job
   */
  private async processSupabaseJob(job: QueueJob) {
    const supabase = getSupabase();
    if (!supabase) return;
    
    try {
      await supabase
        .from('telegram_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);

      const result = await this.processJob(job);
      
      const completedAt = new Date().toISOString();
      await supabase
        .from('telegram_jobs')
        .update({
          status: 'completed',
          result,
          completed_at: completedAt,
        })
        .eq('id', job.id);
      
      console.log(`[Queue] Supabase job completed: ${job.id}`);
      
      // Send Telegram notification
      if (job.data.chatId) {
        const chatId = job.data.chatId;
        const startedAt = job.started_at ? new Date(job.started_at) : new Date();
        const processingTime = Math.round((new Date(completedAt).getTime() - startedAt.getTime()) / 1000);
        
        if (result.published && result.url) {
          await sendTelegramNotification(
            chatId,
            `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
            `📝 <b>Заголовок:</b> ${result.title || 'N/A'}\n` +
            `💬 <b>Слов:</b> ${result.wordCount || 'N/A'}\n` +
            `⏱️ <b>Время:</b> ${processingTime}s\n\n` +
            `🔗 <b>URL:</b>\n${result.url}\n\n` +
            `✨ <b>Статус:</b> Опубликовано на сайте!`
          );
        } else {
          await sendTelegramNotification(
            chatId,
            `✅ <b>Создано</b>\n\n` +
            `📝 Заголовок: ${result.title || 'N/A'}\n` +
            `💬 Слов: ${result.wordCount || 'N/A'}\n` +
            `⏱️ Время: ${processingTime}s`
          );
        }
      }
    } catch (error: any) {
      console.error(`[Queue] Supabase job failed: ${job.id}`, error);
      
      const newRetries = job.retries + 1;
      
      if (newRetries < job.max_retries) {
        await supabase
          .from('telegram_jobs')
          .update({ status: 'pending', retries: newRetries })
          .eq('id', job.id);
        console.log(`[Queue] Job ${job.id} will retry (${newRetries}/${job.max_retries})`);
      } else {
        await supabase
          .from('telegram_jobs')
          .update({
            status: 'failed',
            error: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        console.log(`[Queue] Job ${job.id} FAILED permanently`);
        
        // Send failure notification
        if (job.data.chatId) {
          await sendTelegramNotification(
            job.data.chatId,
            `❌ <b>Ошибка обработки</b>\n\n` +
            `🆔 Job ID: <code>${job.id}</code>\n` +
            `📋 Ошибка: ${error.message}\n` +
            `🔄 Попыток: ${job.retries}/${job.max_retries}\n\n` +
            `Попробуйте еще раз или обратитесь к администратору.`
          );
        }
      }
    }
  }

  /**
   * Process memory job
   */
  private async processMemoryJob(job: QueueJob) {
    job.status = 'processing';
    const startedAt = new Date().toISOString();
    job.started_at = startedAt;
    
    try {
      const result = await this.processJob(job);
      job.status = 'completed';
      job.result = result;
      const completedAt = new Date().toISOString();
      job.completed_at = completedAt;
      console.log(`[Queue] Memory job completed: ${job.id}`);
      
      // Send Telegram notification
      if (job.data.chatId) {
        const chatId = job.data.chatId;
        const processingTime = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
        
        if (result.published && result.url) {
          await sendTelegramNotification(
            chatId,
            `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
            `📝 <b>Заголовок:</b> ${result.title || 'N/A'}\n` +
            `💬 <b>Слов:</b> ${result.wordCount || 'N/A'}\n` +
            `⏱️ <b>Время:</b> ${processingTime}s\n\n` +
            `🔗 <b>URL:</b>\n${result.url}\n\n` +
            `✨ <b>Статус:</b> Опубликовано на сайте!`
          );
        } else {
          await sendTelegramNotification(
            chatId,
            `✅ <b>Создано</b>\n\n` +
            `📝 Заголовок: ${result.title || 'N/A'}\n` +
            `💬 Слов: ${result.wordCount || 'N/A'}\n` +
            `⏱️ Время: ${processingTime}s`
          );
        }
      }
    } catch (error: any) {
      console.error(`[Queue] Memory job failed: ${job.id}`, error);
      job.retries++;
      
      if (job.retries < job.max_retries) {
        job.status = 'pending';
        console.log(`[Queue] Memory job ${job.id} will retry (${job.retries}/${job.max_retries})`);
      } else {
        job.status = 'failed';
        job.error = error.message;
        job.completed_at = new Date().toISOString();
        console.log(`[Queue] Memory job ${job.id} FAILED permanently`);
        
        // Send failure notification
        if (job.data.chatId) {
          await sendTelegramNotification(
            job.data.chatId,
            `❌ <b>Ошибка обработки</b>\n\n` +
            `🆔 Job ID: <code>${job.id}</code>\n` +
            `📋 Ошибка: ${error.message}\n` +
            `🔄 Попыток: ${job.retries}/${job.max_retries}\n\n` +
            `Попробуйте еще раз или обратитесь к администратору.`
          );
        }
      }
    }
  }

  /**
   * Process individual job
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
   * Process URL parsing
   */
  private async processUrlParse(job: QueueJob): Promise<any> {
    const { url, category } = job.data;
    
    if (!url) {
      throw new Error('URL is required');
    }

    const baseUrl = 'https://app.icoffio.com';
    const parseResponse = await fetch(`${baseUrl}/api/admin/parse-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!parseResponse.ok) {
      throw new Error(`URL parsing failed`);
    }

    const parsedContent = await parseResponse.json();
    const formattedContent = parsedContent.content
      .replace(/\.\s+/g, '.\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const result = await publishDualLanguageArticle(
      formattedContent,
      parsedContent.title,
      category
    );

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

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
      publishResult: { en: result.enResult, pl: result.plResult }
    };
  }

  /**
   * Process text generation
   */
  private async processTextGenerate(job: QueueJob): Promise<any> {
    const { text, title, category } = job.data;
    
    if (!text) {
      throw new Error('Text is required');
    }

    const result = await publishDualLanguageArticle(text, title, category);

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

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
      publishResult: { en: result.enResult, pl: result.plResult }
    };
  }

  /**
   * Process AI copywriting
   */
  private async processAICopywrite(job: QueueJob): Promise<any> {
    return await this.processTextGenerate(job);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const supabase = getSupabase();
    
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('telegram_jobs')
          .select('status');

        if (!error && data) {
          return {
            total: data.length,
            pending: data.filter(j => j.status === 'pending').length,
            processing: data.filter(j => j.status === 'processing').length,
            completed: data.filter(j => j.status === 'completed').length,
            failed: data.filter(j => j.status === 'failed').length,
          };
        }
      } catch (err) {
        console.error('[Queue] Supabase getQueueStats error:', err);
      }
    }
    
    // Fallback to memory
    return {
      total: this.memoryQueue.length,
      pending: this.memoryQueue.filter(j => j.status === 'pending').length,
      processing: this.memoryQueue.filter(j => j.status === 'processing').length,
      completed: this.memoryQueue.filter(j => j.status === 'completed').length,
      failed: this.memoryQueue.filter(j => j.status === 'failed').length,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton with global persistence
const globalForQueue = globalThis as unknown as {
  queueService: QueueService | undefined;
};

export function getQueueService(): QueueService {
  if (!globalForQueue.queueService) {
    console.log('[QueueService] Creating new instance');
    globalForQueue.queueService = new QueueService();
  }
  return globalForQueue.queueService;
}

export default QueueService;
