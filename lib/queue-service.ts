/**
 * QUEUE SERVICE
 * 
 * Manages processing queue for Telegram bot requests
 * Ensures sequential processing of article creation/parsing
 * 
 * Features:
 * - FIFO (First In, First Out) queue
 * - Automatic retry on failure
 * - Status tracking
 * - Concurrent processing limit
 * - Progress callbacks
 */

import { publishDualLanguageArticle } from './dual-language-publisher';

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
    submissionId?: number; // Supabase submission ID for tracking
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

class QueueService {
  private queue: QueueJob[] = [];
  private isProcessing: boolean = false;
  private maxConcurrent: number = 1; // Process one at a time
  private currentlyProcessing: Set<string> = new Set();

  /**
   * Add job to queue
   */
  async addJob(job: Omit<QueueJob, 'id' | 'status' | 'createdAt' | 'retryCount'>): Promise<string> {
    const id = this.generateId();
    
    const newJob: QueueJob = {
      ...job,
      id,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: job.maxRetries || 3
    };

    this.queue.push(newJob);
    
    console.log(`[Queue] Job added: ${id} (type: ${job.type})`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process queue sequentially
   */
  private async processQueue() {
    if (this.isProcessing || this.currentlyProcessing.size >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.currentlyProcessing.size < this.maxConcurrent) {
      const job = this.queue.find(j => j.status === 'pending');
      
      if (!job) break;

      job.status = 'processing';
      job.startedAt = new Date();
      this.currentlyProcessing.add(job.id);

      console.log(`[Queue] Processing job: ${job.id} (${this.queue.length - 1} remaining)`);
      console.log(`[Queue] Job type: ${job.type}, data:`, JSON.stringify(job.data));

      try {
        console.log(`[Queue] Starting processJob for: ${job.id}`);
        const result = await this.processJob(job);
        
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;
        
        console.log(`[Queue] Job completed: ${job.id}`, JSON.stringify(result));
        
      } catch (error: any) {
        console.error(`[Queue] Job failed: ${job.id}`, error);
        
        job.retryCount++;
        
        if (job.retryCount < job.maxRetries) {
          // Retry
          job.status = 'pending';
          job.error = undefined;
          console.log(`[Queue] Retrying job: ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries})`);
        } else {
          // Max retries reached
          job.status = 'failed';
          job.completedAt = new Date();
          job.error = error.message || 'Unknown error';
          console.error(`[Queue] Job failed permanently: ${job.id}`);
        }
      } finally {
        this.currentlyProcessing.delete(job.id);
      }
    }

    this.isProcessing = false;

    // Continue processing if more jobs added
    // OPTIMIZATION: Only process if explicitly triggered, not auto-polling
    if (this.queue.some(j => j.status === 'pending')) {
      // Removed auto-polling to reduce function invocations
      // Processing will be triggered by addJob() or external trigger
      console.log('[Queue] Pending jobs remain, awaiting next trigger');
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

    // Step 1: Parse URL content
    console.log(`[Queue] Parsing URL: ${url}`);
    const baseUrl = 'https://app.icoffio.com';
    const parseResponse = await fetch(`${baseUrl}/api/admin/parse-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!parseResponse.ok) {
      const error = await parseResponse.text();
      throw new Error(`URL parsing failed: ${error}`);
    }

    const parsedContent = await parseResponse.json();
    console.log(`[Queue] Parsed: "${parsedContent.title}"`);

    // Step 2: Use dual-language publisher (EN + PL + 2 images)
    // Format content as paragraphs (split by periods, add double newlines)
    const formattedContent = parsedContent.content
      .replace(/\.\s+/g, '.\n\n') // Add paragraph breaks after sentences
      .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
      .trim();

    console.log(`[Queue] Publishing dual-language article from parsed URL...`);
    
    const result = await publishDualLanguageArticle(
      formattedContent, // Use parsed content as prompt
      parsedContent.title, // Use parsed title
      category // Optional user category (AI will detect if not provided)
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
      url: result.enResult.url, // Primary (EN) URL
      urlPl: result.plResult?.url || null, // Polish URL
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

    // Use dual-language publisher (generates EN + PL with 2 images)
    // AI will auto-detect category and optimize title
    console.log(`[Queue] Starting dual-language article generation...`);
    
    const result = await publishDualLanguageArticle(
      text,
      title, // Optional user title
      category // Optional user category (AI will detect if not provided)
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
      url: result.enResult.url, // Primary (EN) URL
      urlPl: result.plResult?.url || null, // Polish URL
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
    // Similar to text-generate but with different parameters
    return await this.processTextGenerate(job);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | undefined {
    return this.queue.find(j => j.id === jobId);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(j => j.status === 'pending').length,
      processing: this.queue.filter(j => j.status === 'processing').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear completed/failed jobs older than X minutes
   */
  cleanupOldJobs(minutesOld: number = 60) {
    const cutoff = new Date(Date.now() - minutesOld * 60 * 1000);
    
    const before = this.queue.length;
    this.queue = this.queue.filter(job => {
      if (job.status === 'pending' || job.status === 'processing') {
        return true; // Keep active jobs
      }
      
      return job.completedAt && job.completedAt > cutoff;
    });
    
    const removed = before - this.queue.length;
    if (removed > 0) {
      console.log(`[Queue] Cleaned up ${removed} old jobs`);
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
    queueServiceInstance = new QueueService();
    
    // Auto cleanup every 30 minutes
    setInterval(() => {
      queueServiceInstance?.cleanupOldJobs(30);
    }, 30 * 60 * 1000);
  }
  
  return queueServiceInstance;
}

export default QueueService;

