/**
 * 🖼️ IMAGE OPTIMIZER v8.2.0
 * 
 * Client-side image optimization utility.
 * Converts images to WebP format and compresses them for optimal web performance.
 * 
 * Features:
 * - Resize to max dimensions (default 1920px width)
 * - Convert to WebP format (90% smaller than PNG)
 * - Adjustable quality (default 0.85)
 * - Preserve aspect ratio
 * - Memory efficient with canvas cleanup
 * 
 * Usage:
 *   const optimized = await optimizeImage(file, { maxWidth: 1200, quality: 0.8 });
 *   // optimized.blob - compressed image
 *   // optimized.dataUrl - for preview
 */

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  preserveAspectRatio?: boolean;
}

export interface OptimizedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
}

const DEFAULT_OPTIONS: Required<OptimizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'webp',
  preserveAspectRatio: true
};

/**
 * Оптимизирует изображение для web
 */
export async function optimizeImage(
  file: File | Blob,
  options: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const originalWidth = width;
        const originalHeight = height;
        
        if (opts.preserveAspectRatio) {
          // Scale down if exceeds max dimensions
          if (width > opts.maxWidth) {
            height = Math.round(height * (opts.maxWidth / width));
            width = opts.maxWidth;
          }
          if (height > opts.maxHeight) {
            width = Math.round(width * (opts.maxHeight / height));
            height = opts.maxHeight;
          }
        } else {
          width = Math.min(width, opts.maxWidth);
          height = Math.min(height, opts.maxHeight);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        // Use high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to target format
        const mimeType = `image/${opts.format}`;
        const dataUrl = canvas.toDataURL(mimeType, opts.quality);
        
        // Convert data URL to Blob
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        
        // Cleanup
        URL.revokeObjectURL(objectUrl);
        
        const originalSize = file.size;
        const optimizedSize = blob.size;
        const compressionRatio = optimizedSize / originalSize;
        
        console.log(`🖼️ Image optimized: ${originalWidth}x${originalHeight} → ${width}x${height}`);
        console.log(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${Math.round(compressionRatio * 100)}%)`);
        
        resolve({
          blob,
          dataUrl,
          width,
          height,
          originalSize,
          optimizedSize,
          compressionRatio,
          format: opts.format
        });
        
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Batch optimize multiple images
 */
export async function optimizeImages(
  files: (File | Blob)[],
  options: OptimizeOptions = {}
): Promise<OptimizedImage[]> {
  const results = await Promise.all(
    files.map(file => optimizeImage(file, options))
  );
  
  // Calculate total compression
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
  const totalRatio = totalOptimized / totalOriginal;
  
  console.log(`📊 Batch optimization complete:`);
  console.log(`   ${files.length} images processed`);
  console.log(`   Total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalOptimized / 1024 / 1024).toFixed(2)}MB (${Math.round(totalRatio * 100)}%)`);
  
  return results;
}

/**
 * Create optimized thumbnail
 */
export async function createThumbnail(
  file: File | Blob,
  size: number = 200
): Promise<OptimizedImage> {
  return optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'webp'
  });
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Неподдерживаемый формат: ${file.type}. Разрешены: JPG, PNG, WebP, GIF`
    };
  }
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB. Максимум: 10MB`
    };
  }
  
  return { valid: true };
}

/**
 * Convert optimized image to File object for upload
 */
export function optimizedToFile(optimized: OptimizedImage, filename: string): File {
  const extension = optimized.format === 'jpeg' ? 'jpg' : optimized.format;
  const name = filename.replace(/\.[^.]+$/, '') + '.' + extension;
  
  return new File([optimized.blob], name, {
    type: `image/${optimized.format}`,
    lastModified: Date.now()
  });
}

/**
 * Preset configurations for different use cases
 */
export const OPTIMIZATION_PRESETS = {
  hero: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.9,
    format: 'webp' as const
  },
  content: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.85,
    format: 'webp' as const
  },
  thumbnail: {
    maxWidth: 400,
    maxHeight: 300,
    quality: 0.75,
    format: 'webp' as const
  },
  social: {
    maxWidth: 1200,
    maxHeight: 630,
    quality: 0.85,
    format: 'webp' as const
  }
};

// ============================================================================
// BLUR PLACEHOLDER GENERATION
// ============================================================================

/**
 * Генерирует tiny blur placeholder для Progressive Image Loading
 * Создаёт очень маленькое изображение (10x10) в base64
 */
export async function generateBlurPlaceholder(
  file: File | Blob
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        // Создаём очень маленький canvas (10x10 пикселей)
        const canvas = document.createElement('canvas');
        const size = 10;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        // Рисуем изображение в маленьком размере
        ctx.drawImage(img, 0, 0, size, size);
        
        // Конвертируем в base64 с низким качеством
        const blurDataUrl = canvas.toDataURL('image/jpeg', 0.1);
        
        // Cleanup
        URL.revokeObjectURL(objectUrl);
        
        console.log(`🌫️ Blur placeholder generated (${blurDataUrl.length} bytes)`);
        resolve(blurDataUrl);
        
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for blur generation'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Генерирует blur placeholder из URL изображения
 */
export async function generateBlurFromUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Для CORS
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 10;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        ctx.drawImage(img, 0, 0, size, size);
        const blurDataUrl = canvas.toDataURL('image/jpeg', 0.1);
        
        resolve(blurDataUrl);
      } catch (error) {
        // Fallback для CORS ошибок
        resolve(getDefaultBlurPlaceholder());
      }
    };
    
    img.onerror = () => {
      // Fallback
      resolve(getDefaultBlurPlaceholder());
    };
    
    img.src = imageUrl;
  });
}

/**
 * Стандартный blur placeholder (серый градиент)
 */
export function getDefaultBlurPlaceholder(): string {
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBRIhMQYTQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAABAhEhMf/aAAwDAQACEQMRAD8AyLT9Ps7qzgluIEkkZAxYjk5p3+P6f/QsP9pSlSbKdH//2Q==';
}

// ============================================================================
// UPLOAD TO VERCEL BLOB
// ============================================================================

/**
 * Загружает оптимизированное изображение в Vercel Blob
 */
export async function uploadToVercelBlob(
  file: File,
  options?: OptimizeOptions
): Promise<{
  url: string;
  blurDataUrl: string;
  size: number;
  optimizedSize: number;
}> {
  // 1. Оптимизируем изображение
  const optimized = await optimizeImage(file, options || OPTIMIZATION_PRESETS.content);
  
  // 2. Генерируем blur placeholder
  const blurDataUrl = await generateBlurPlaceholder(file);
  
  // 3. Загружаем в Vercel Blob через API
  const formData = new FormData();
  formData.append('file', optimizedToFile(optimized, file.name));
  
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  const result = await response.json();
  
  console.log(`📤 Uploaded to Vercel Blob:`);
  console.log(`   Original: ${(file.size / 1024).toFixed(1)}KB`);
  console.log(`   Optimized: ${(optimized.optimizedSize / 1024).toFixed(1)}KB`);
  console.log(`   URL: ${result.url}`);
  
  return {
    url: result.url,
    blurDataUrl,
    size: file.size,
    optimizedSize: optimized.optimizedSize
  };
}

