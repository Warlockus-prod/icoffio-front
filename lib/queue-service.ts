/**
 * QUEUE SERVICE v7.12.0 - SUPABASE WITH TIMEOUT PROTECTION
 * 
 * Manages processing queue for Telegram bot requests
 * Uses Supabase for persistent storage with graceful fallback to in-memory
 * 
 * Features:
 * - ✅ Persistent storage (Supabase) when available
 * - ✅ In-memory fallback if Supabase fails
 * - ✅ Serverless-safe
 * - ✅ FIFO queue
 * - ✅ Automatic retry (max 3 attempts)
 * - ✅ TIMEOUT protection (180 seconds)
 * - ✅ Enhanced logging with emojis
 * 
 * @version 7.12.0
 * @date 2025-10-30
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publishDualLanguageArticle } from './dual-language-publisher';
import { getSiteBaseUrl } from './site-url';

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
    
    console.log('[Queue] 🔑 Checking Supabase credentials:', {
      url: supabaseUrl ? '✅ SET' : '❌ MISSING',
      key: supabaseServiceKey ? '✅ SET' : '❌ MISSING',
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Queue] ❌❌❌ CRITICAL: Supabase NOT configured! In-memory queue will NOT work in serverless!');
      supabaseAvailable = false;
      return null;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      console.log('[Queue] ✅ Supabase client initialized successfully');
    } catch (error) {
      console.error('[Queue] ❌ Failed to initialize Supabase:', error);
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
    
    console.log(`[Queue] 📝 Adding job: ${id}, type: ${job.type}, supabase: ${!!supabase}`);
    
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
          console.log(`[Queue] ✅ Job added to Supabase: ${id}`);
          this.processQueue().catch(err => 
            console.error('[Queue] Process queue error:', err)
          );
          return id;
        }
        
        console.error('[Queue] ❌ Supabase insert failed:', error);
      } catch (err) {
        console.error('[Queue] ❌ Supabase error:', err);
      }
    } else {
      console.log('[Queue] ⚠️ Supabase NOT configured, using in-memory');
    }
    
    // Fallback to in-memory
    console.log(`[Queue] 💾 Using in-memory queue for: ${id}`);
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
    console.log(`[Queue] 📊 Memory queue size: ${this.memoryQueue.length}`);
    
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
    console.log('[Queue] 🚀 processQueue() called');
    
    const supabase = getSupabase();
    
    // SERVERLESS FIX: Check database for processing jobs instead of in-memory flag
    if (supabase) {
      try {
        // ⚠️ CRITICAL: First cleanup stuck jobs (> 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: stuckJobs } = await supabase
          .from('telegram_jobs')
          .select('id, created_at, retries, max_retries')
          .eq('status', 'processing')
          .lt('created_at', twoMinutesAgo);
        
        if (stuckJobs && stuckJobs.length > 0) {
          console.log(`[Queue] 🧹 Found ${stuckJobs.length} stuck job(s), cleaning up...`);
          
          for (const job of stuckJobs) {
            const canRetry = (job.retries || 0) < (job.max_retries || 3);
            
            if (canRetry) {
              console.log(`[Queue] 🔄 Resetting stuck job ${job.id} for retry (${job.retries + 1}/${job.max_retries})`);
              await supabase
                .from('telegram_jobs')
                .update({
                  status: 'pending',
                  retries: (job.retries || 0) + 1,
                  error: 'Job stuck in processing, resetting for retry'
                })
                .eq('id', job.id);
            } else {
              console.log(`[Queue] ❌ Marking stuck job ${job.id} as failed (max retries reached)`);
              await supabase
                .from('telegram_jobs')
                .update({
                  status: 'failed',
                  error: `Job timeout after ${job.retries} retries`,
                  completed_at: new Date().toISOString()
                })
                .eq('id', job.id);
            }
          }
        }
        
        // Now check if any FRESH job is currently processing (created in last 2 minutes)
        const { data: processingJobs, error: procError } = await supabase
          .from('telegram_jobs')
          .select('id, created_at')
          .eq('status', 'processing')
          .gte('created_at', twoMinutesAgo);
        
        if (procError) {
          console.error('[Queue] Error checking processing jobs:', procError);
        } else if (processingJobs && processingJobs.length > 0) {
          console.log(`[Queue] ⏸️ Already ${processingJobs.length} FRESH job(s) processing, skipping`);
          return;
        }
      } catch (err) {
        console.error('[Queue] Error in processing check:', err);
      }
    }

    // Old in-memory check (fallback for memory queue)
    if (this.isProcessing) {
      console.log('[Queue] In-memory isProcessing=true, skipping');
      return;
    }

    this.isProcessing = true;
    console.log('[Queue] ✅ Starting queue processing...');

    try {
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
            console.error('[Queue] ❌ Supabase query error:', error);
          } else if (pendingJobs && pendingJobs.length > 0) {
            console.log(`[Queue] 📋 Found ${pendingJobs.length} pending job(s) in Supabase`);
            await this.processSupabaseJob(pendingJobs[0] as QueueJob);
            
            // Continue processing remaining jobs
            this.isProcessing = false;
            if (pendingJobs.length > 1) {
              console.log(`[Queue] 🔄 ${pendingJobs.length - 1} more job(s) remaining, continuing...`);
              setTimeout(() => this.processQueue(), 2000);
            }
            return;
          } else {
            console.log('[Queue] ℹ️ No pending jobs in Supabase');
          }
        } catch (err) {
          console.error('[Queue] ❌ Supabase processQueue error:', err);
        }
      } else {
        console.log('[Queue] ⚠️ Supabase not available, checking memory queue...');
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
   * Process Supabase job with TIMEOUT
   */
  private async processSupabaseJob(job: QueueJob) {
    const supabase = getSupabase();
    if (!supabase) return;
    
    const startedAt = new Date().toISOString();
    
    try {
      await supabase
        .from('telegram_jobs')
        .update({ status: 'processing', started_at: startedAt })
        .eq('id', job.id);

      console.log(`[Queue] 🚀 Starting job: ${job.id} (type: ${job.type})`);

      // ⏱️ ADD TIMEOUT: 50 seconds (LESS than Vercel 60s limit)
      const TIMEOUT = 50000;
      const result = await Promise.race([
        this.processJob(job),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job timeout after 50 seconds')), TIMEOUT)
        )
      ]);
      
      const completedAt = new Date().toISOString();
      const processingTime = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
      
      console.log(`[Queue] ✅ Job completed: ${job.id} (${processingTime}s)`);
      
      await supabase
        .from('telegram_jobs')
        .update({
          status: 'completed',
          result,
          completed_at: completedAt,
        })
        .eq('id', job.id);
      
      // Send Telegram notification
      if (job.data.chatId) {
        const chatId = job.data.chatId;
        
        if ((result as any).published && (result as any).url) {
          // Format message with both EN and PL URLs if available
          let message = `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
            `📝 <b>Заголовок:</b> ${(result as any).title || 'N/A'}\n` +
            `💬 <b>Слов:</b> ${(result as any).wordCount || 'N/A'}\n` +
            `⏱️ <b>Время:</b> ${processingTime}s\n\n`;
          
          // Add English URL
          message += `🇬🇧 <b>EN:</b>\n${(result as any).url}\n\n`;
          
          // Add Polish URL if available
          if ((result as any).urlPl) {
            message += `🇵🇱 <b>PL:</b>\n${(result as any).urlPl}\n\n`;
          }
          
          message += `✨ <b>Статус:</b> Опубликовано на сайте!`;
          
          await sendTelegramNotification(chatId, message);
        } else {
          await sendTelegramNotification(
            chatId,
            `✅ <b>Создано</b>\n\n` +
            `📝 Заголовок: ${(result as any).title || 'N/A'}\n` +
            `💬 Слов: ${(result as any).wordCount || 'N/A'}\n` +
            `⏱️ Время: ${processingTime}s`
          );
        }
      }
    } catch (error: any) {
      console.error(`[Queue] ❌ Job failed: ${job.id}`, error.message);
      
      const newRetries = job.retries + 1;
      
      if (newRetries < job.max_retries) {
        await supabase
          .from('telegram_jobs')
          .update({ status: 'pending', retries: newRetries })
          .eq('id', job.id);
        console.log(`[Queue] 🔄 Job ${job.id} will retry (${newRetries}/${job.max_retries})`);
      } else {
        await supabase
          .from('telegram_jobs')
          .update({
            status: 'failed',
            error: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        console.log(`[Queue] 💀 Job ${job.id} FAILED permanently`);
        
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
   * Process memory job with TIMEOUT
   */
  private async processMemoryJob(job: QueueJob) {
    job.status = 'processing';
    const startedAt = new Date().toISOString();
    job.started_at = startedAt;
    
    console.log(`[Queue] 🚀 Starting memory job: ${job.id} (type: ${job.type})`);
    
    try {
      // ⏱️ ADD TIMEOUT: 50 seconds (LESS than Vercel 60s limit)
      const TIMEOUT = 50000;
      const result = await Promise.race([
        this.processJob(job),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job timeout after 50 seconds')), TIMEOUT)
        )
      ]);
      
      job.status = 'completed';
      job.result = result;
      const completedAt = new Date().toISOString();
      job.completed_at = completedAt;
      const processingTime = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
      
      console.log(`[Queue] ✅ Memory job completed: ${job.id} (${processingTime}s)`);
      
      // Send Telegram notification
      if (job.data.chatId) {
        const chatId = job.data.chatId;
        
        if ((result as any).published && (result as any).url) {
          // Format message with both EN and PL URLs if available
          let message = `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
            `📝 <b>Заголовок:</b> ${(result as any).title || 'N/A'}\n` +
            `💬 <b>Слов:</b> ${(result as any).wordCount || 'N/A'}\n` +
            `⏱️ <b>Время:</b> ${processingTime}s\n\n`;
          
          // Add English URL
          message += `🇬🇧 <b>EN:</b>\n${(result as any).url}\n\n`;
          
          // Add Polish URL if available
          if ((result as any).urlPl) {
            message += `🇵🇱 <b>PL:</b>\n${(result as any).urlPl}\n\n`;
          }
          
          message += `✨ <b>Статус:</b> Опубликовано на сайте!`;
          
          await sendTelegramNotification(chatId, message);
        } else {
          await sendTelegramNotification(
            chatId,
            `✅ <b>Создано</b>\n\n` +
            `📝 Заголовок: ${(result as any).title || 'N/A'}\n` +
            `💬 Слов: ${(result as any).wordCount || 'N/A'}\n` +
            `⏱️ Время: ${processingTime}s`
          );
        }
      }
    } catch (error: any) {
      console.error(`[Queue] ❌ Memory job failed: ${job.id}`, error.message);
      job.retries++;
      
      if (job.retries < job.max_retries) {
        job.status = 'pending';
        console.log(`[Queue] 🔄 Memory job ${job.id} will retry (${job.retries}/${job.max_retries})`);
      } else {
        job.status = 'failed';
        job.error = error.message;
        job.completed_at = new Date().toISOString();
        console.log(`[Queue] 💀 Memory job ${job.id} FAILED permanently`);
        
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

    const baseUrl = getSiteBaseUrl();
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
      category,
      job.data.chatId
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

    const result = await publishDualLanguageArticle(text, title, category, job.data.chatId);

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
    
    console.log(`[Queue] 📊 Getting stats, supabase: ${!!supabase}, memory: ${this.memoryQueue.length}`);
    
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('telegram_jobs')
          .select('status');

        if (!error && data) {
          console.log(`[Queue] 📊 Supabase stats: ${data.length} total jobs`);
          return {
            total: data.length,
            pending: data.filter(j => j.status === 'pending').length,
            processing: data.filter(j => j.status === 'processing').length,
            completed: data.filter(j => j.status === 'completed').length,
            failed: data.filter(j => j.status === 'failed').length,
          };
        }
        
        console.error('[Queue] ❌ Supabase getQueueStats error:', error);
      } catch (err) {
        console.error('[Queue] ❌ Supabase getQueueStats exception:', err);
      }
    }
    
    // Fallback to memory
    console.log(`[Queue] 💾 Memory stats: ${this.memoryQueue.length} total jobs`);
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
