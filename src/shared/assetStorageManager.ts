import { ImageMetadata, StorageResult } from './types';

// Cloudflare Worker types (these should be available globally in the worker environment)
declare global {
  interface R2Bucket {
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
    get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
    head(key: string): Promise<R2Object | null>;
    delete(key: string | string[]): Promise<void>;
    list(options?: R2ListOptions): Promise<R2Objects>;
  }
  
  interface R2Object {
    key: string;
    version: string;
    size: number;
    etag: string;
    httpEtag: string;
    uploaded: Date;
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    body?: ReadableStream;
    bodyUsed?: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
    blob(): Promise<Blob>;
  }
  
  interface R2Objects {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  }
  
  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
  }
  
  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  }
  
  interface R2GetOptions {
    onlyIf?: R2Conditional;
    range?: R2Range;
  }
  
  interface R2ListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
    delimiter?: string;
  }
  
  interface R2Conditional {
    etagMatches?: string;
    etagDoesNotMatch?: string;
    uploadedBefore?: Date;
    uploadedAfter?: Date;
  }
  
  interface R2Range {
    offset?: number;
    length?: number;
    suffix?: number;
  }
}

/**
 * Asset Storage Manager for Cloudflare R2
 * Handles image storage with UUID-based object keys, metadata embedding,
 * and public URL generation optimized for zero egress fees
 */
export class AssetStorageManager {
  private r2Bucket: R2Bucket;
  private bucketName: string;

  constructor(r2Bucket: R2Bucket, bucketName: string = 'capitao-caverna-images') {
    this.r2Bucket = r2Bucket;
    this.bucketName = bucketName;
  }

  /**
   * Generate a UUID-based object key to avoid collisions
   */
  private generateObjectKey(extension: string = 'png'): string {
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    return `images/${timestamp}/${uuid}.${extension}`;
  }

  /**
   * Extract file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return typeMap[contentType.toLowerCase()] || 'png';
  }

  /**
   * Generate public URL for stored image
   * Uses Cloudflare R2 public URL format for zero egress fees
   */
  generatePublicUrl(objectKey: string): string {
    // R2 public URL format: https://<bucket-name>.<account-id>.r2.cloudflarestorage.com/<object-key>
    // For custom domains, this would be: https://images.yourdomain.com/<object-key>
    return `https://${this.bucketName}.r2.cloudflarestorage.com/${objectKey}`;
  }

  /**
   * Store image in R2 with metadata embedding
   */
  async storeImage(imageData: Blob | ArrayBuffer | Uint8Array, metadata: ImageMetadata): Promise<StorageResult> {
    try {
      const extension = this.getExtensionFromContentType(metadata.contentType);
      const objectKey = this.generateObjectKey(extension);

      // Prepare R2 object metadata
      const r2Metadata = {
        'content-type': metadata.contentType,
        'original-filename': metadata.originalFilename || 'generated-image',
        'size': metadata.size.toString(),
        'created-at': metadata.createdAt,
        'generation-params': JSON.stringify(metadata.generationParams),
        'pose': metadata.generationParams.pose,
        'outfit': metadata.generationParams.outfit,
        'footwear': metadata.generationParams.footwear,
        'prop': metadata.generationParams.prop || '',
        'frame-type': metadata.generationParams.frameType || '',
        'frame-id': metadata.generationParams.frameId || '',
      };

      // Store in R2 with metadata
      await this.r2Bucket.put(objectKey, imageData, {
        httpMetadata: {
          contentType: metadata.contentType,
          cacheControl: 'public, max-age=31536000', // 1 year cache for images
        },
        customMetadata: r2Metadata,
      });

      const publicUrl = this.generatePublicUrl(objectKey);

      return {
        success: true,
        objectKey,
        publicUrl,
      };
    } catch (error) {
      console.error('Error storing image in R2:', error);
      return {
        success: false,
        objectKey: '',
        publicUrl: '',
        error: error instanceof Error ? error.message : 'Unknown storage error',
      };
    }
  }

  /**
   * Retrieve image from R2
   */
  async getImage(objectKey: string): Promise<R2Object | null> {
    try {
      return await this.r2Bucket.get(objectKey);
    } catch (error) {
      console.error('Error retrieving image from R2:', error);
      return null;
    }
  }

  /**
   * Get image metadata without downloading the full object
   */
  async getImageMetadata(objectKey: string): Promise<R2Object | null> {
    try {
      return await this.r2Bucket.head(objectKey);
    } catch (error) {
      console.error('Error retrieving image metadata from R2:', error);
      return null;
    }
  }

  /**
   * Delete image from R2
   */
  async deleteImage(objectKey: string): Promise<boolean> {
    try {
      await this.r2Bucket.delete(objectKey);
      return true;
    } catch (error) {
      console.error('Error deleting image from R2:', error);
      return false;
    }
  }

  /**
   * Bulk delete images from R2
   */
  async deleteImages(objectKeys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    // R2 supports bulk delete, but we'll implement it as individual deletes for now
    // This can be optimized later with R2's bulk delete API
    for (const objectKey of objectKeys) {
      try {
        await this.r2Bucket.delete(objectKey);
        success.push(objectKey);
      } catch (error) {
        console.error(`Error deleting image ${objectKey} from R2:`, error);
        failed.push(objectKey);
      }
    }

    return { success, failed };
  }

  /**
   * List images with optional prefix filtering
   */
  async listImages(options: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<R2Objects> {
    try {
      return await this.r2Bucket.list({
        prefix: options.prefix || 'images/',
        limit: options.limit || 1000,
        cursor: options.cursor,
      });
    } catch (error) {
      console.error('Error listing images from R2:', error);
      throw error;
    }
  }

  /**
   * Cleanup old images based on age
   */
  async cleanupOldImages(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    try {
      let cursor: string | undefined;
      
      do {
        const listing = await this.listImages({ cursor });
        
        for (const object of listing.objects) {
          if (object.uploaded && object.uploaded < cutoffDate) {
            const success = await this.deleteImage(object.key);
            if (success) {
              deleted++;
            } else {
              errors++;
            }
          }
        }
        
        cursor = listing.truncated ? listing.cursor : undefined;
      } while (cursor);

    } catch (error) {
      console.error('Error during cleanup operation:', error);
      errors++;
    }

    return { deleted, errors };
  }

  /**
   * Get storage utilization statistics
   */
  async getStorageStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    oldestObject?: Date;
    newestObject?: Date;
  }> {
    let totalObjects = 0;
    let totalSize = 0;
    let oldestObject: Date | undefined;
    let newestObject: Date | undefined;

    try {
      let cursor: string | undefined;
      
      do {
        const listing = await this.listImages({ cursor });
        
        for (const object of listing.objects) {
          totalObjects++;
          totalSize += object.size;
          
          if (object.uploaded) {
            if (!oldestObject || object.uploaded < oldestObject) {
              oldestObject = object.uploaded;
            }
            if (!newestObject || object.uploaded > newestObject) {
              newestObject = object.uploaded;
            }
          }
        }
        
        cursor = listing.truncated ? listing.cursor : undefined;
      } while (cursor);

    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }

    return {
      totalObjects,
      totalSize,
      oldestObject,
      newestObject,
    };
  }

  /**
   * Validate image data before storage
   */
  private validateImageData(_imageData: Blob | ArrayBuffer | Uint8Array, metadata: ImageMetadata): void {
    // Check file size limits (e.g., 10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (metadata.size > maxSize) {
      throw new Error(`Image size ${metadata.size} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Validate content type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(metadata.contentType.toLowerCase())) {
      throw new Error(`Unsupported content type: ${metadata.contentType}`);
    }

    // Validate generation parameters
    if (!metadata.generationParams.pose || !metadata.generationParams.outfit || !metadata.generationParams.footwear) {
      throw new Error('Missing required generation parameters: pose, outfit, and footwear are required');
    }
  }

  /**
   * Store image with validation
   */
  async storeImageWithValidation(imageData: Blob | ArrayBuffer | Uint8Array, metadata: ImageMetadata): Promise<StorageResult> {
    try {
      this.validateImageData(imageData, metadata);
      return await this.storeImage(imageData, metadata);
    } catch (error) {
      console.error('Image validation failed:', error);
      return {
        success: false,
        objectKey: '',
        publicUrl: '',
        error: error instanceof Error ? error.message : 'Validation error',
      };
    }
  }
}

/**
 * Factory function to create AssetStorageManager instance
 */
export function createAssetStorageManager(env: { IMAGE_BUCKET: R2Bucket }): AssetStorageManager {
  return new AssetStorageManager(env.IMAGE_BUCKET);
}

/**
 * Utility functions for working with image data
 */
export class ImageUtils {
  /**
   * Convert Response to Blob
   */
  static async responseToBlob(response: Response): Promise<Blob> {
    return await response.blob();
  }

  /**
   * Convert ArrayBuffer to Blob
   */
  static arrayBufferToBlob(buffer: ArrayBuffer, contentType: string): Blob {
    return new Blob([buffer], { type: contentType });
  }

  /**
   * Get image dimensions from blob (basic implementation)
   */
  static async getImageDimensions(blob: Blob): Promise<{ width: number; height: number } | null> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to use a proper image processing library
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Basic PNG dimension extraction (simplified)
      if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        // PNG format
        const width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
        const height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
        return { width, height };
      }
      
      // Basic JPEG dimension extraction would go here
      // For now, return null for unsupported formats
      return null;
    } catch (error) {
      console.error('Error extracting image dimensions:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail key from original key
   */
  static generateThumbnailKey(originalKey: string, size: string = '150x150'): string {
    const parts = originalKey.split('.');
    const extension = parts.pop();
    const baseName = parts.join('.');
    return `${baseName}_thumb_${size}.${extension}`;
  }
}