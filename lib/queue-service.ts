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

      try {
        const result = await this.processJob(job);
        
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;
        
        console.log(`[Queue] Job completed: ${job.id}`);
        
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
    if (this.queue.some(j => j.status === 'pending')) {
      setTimeout(() => this.processQueue(), 100);
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
    const { url } = job.data;
    
    if (!url) {
      throw new Error('URL is required for url-parse job');
    }

    // Call URL parser API
    const response = await fetch('/api/admin/parse-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`URL parsing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Process text generation job
   */
  private async processTextGenerate(job: QueueJob): Promise<any> {
    const { text, title, category, language } = job.data;
    
    if (!text) {
      throw new Error('Text is required for text-generate job');
    }

    // Call AI copywriting API
    const response = await fetch('/api/admin/generate-article-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: text,
        title: title || undefined,
        category: category || 'Technology',
        language: language || 'en',
        targetWords: 600,
        style: 'professional'
      }),
    });

    if (!response.ok) {
      throw new Error(`Text generation failed: ${response.statusText}`);
    }

    return await response.json();
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

