import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';


interface FileProcessingResult {
  success: boolean;
  extractedText?: string;
  error?: string;
}

export class FileService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(env: Env) {
    if (!env.MINIO_ENDPOINT || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY || !env.MINIO_BUCKET_NAME) {
      throw new Error('MinIO configuration is incomplete. Please set all MINIO_* environment variables.');
    }

    this.s3Client = new S3Client({
      region: 'us-east-1', // Default region for Minio
      endpoint: env.MINIO_ENDPOINT,
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Required for Minio
    });
    this.bucketName = env.MINIO_BUCKET_NAME;
  }

  async uploadFile(file: File, category: string): Promise<{ key: string; fileInfo: any }> {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const key = `${category}/${timestamp}-${randomStr}-${file.name}`;

    const buffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        category: category,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    return {
      key,
      fileInfo: {
        filename: key,
        original_name: file.name,
        file_type: file.type,
        file_size: file.size,
        minio_key: key,
        category: category,
      },
    };
  }

  async getFile(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('File not found');
    }

    // Convert the stream to Uint8Array
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  async processFile(fileBuffer: Uint8Array, fileType: string): Promise<FileProcessingResult> {
    try {
      let extractedText = '';

      switch (fileType) {
        case 'text/plain':
          extractedText = new TextDecoder().decode(fileBuffer);
          break;

        case 'application/pdf':
          try {
            // Use dynamic imports to avoid bundling issues
            const pdfParse = await import('pdf-parse');
            const pdfData = await pdfParse.default(Buffer.from(fileBuffer));
            extractedText = pdfData.text;
          } catch (error) {
            console.error('PDF processing error:', error);
            return {
              success: false,
              error: 'Failed to process PDF file. The file may be corrupted or password-protected.',
            };
          }
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          try {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
            extractedText = result.value;
          } catch (error) {
            console.error('DOCX processing error:', error);
            return {
              success: false,
              error: 'Failed to process Word document. The file may be corrupted.',
            };
          }
          break;

        case 'application/msword':
          return {
            success: false,
            error: 'Legacy .doc files are not supported. Please convert to .docx format.',
          };

        default:
          return {
            success: false,
            error: `Unsupported file type: ${fileType}. Supported types: TXT, PDF, DOCX`,
          };
      }

      if (!extractedText.trim()) {
        return {
          success: false,
          error: 'No text could be extracted from the file.',
        };
      }

      return {
        success: true,
        extractedText: extractedText.trim(),
      };
    } catch (error) {
      console.error('File processing error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while processing the file.',
      };
    }
  }

  async processAndStoreFile(
    file: File, 
    category: string, 
    db: any
  ): Promise<{ success: boolean; message: string; entriesAdded?: number }> {
    try {
      // Upload to Minio
      const { fileInfo } = await this.uploadFile(file, category);

      // Insert file record
      const insertFileStmt = db.prepare(`
        INSERT INTO uploaded_files (
          filename, original_name, file_type, file_size, minio_key, category, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const fileResult = await insertFileStmt.bind(
        fileInfo.filename,
        fileInfo.original_name,
        fileInfo.file_type,
        fileInfo.file_size,
        fileInfo.minio_key,
        fileInfo.category,
        'processing'
      ).run();

      const fileId = fileResult.meta.last_row_id;

      // Process file content
      const fileBuffer = await file.arrayBuffer();
      const processingResult = await this.processFile(new Uint8Array(fileBuffer), file.type);

      if (!processingResult.success) {
        // Update file record with error
        await db.prepare(`
          UPDATE uploaded_files 
          SET processing_status = 'failed', extraction_result = ?
          WHERE id = ?
        `).bind(processingResult.error, fileId).run();

        return {
          success: false,
          message: processingResult.error || 'Failed to process file',
        };
      }

      // Split content into chunks and add to knowledge base
      const maxChunkSize = 2000;
      const content = processingResult.extractedText!;
      const chunks = [];
      
      if (content.length > maxChunkSize) {
        for (let i = 0; i < content.length; i += maxChunkSize) {
          chunks.push(content.substring(i, i + maxChunkSize));
        }
      } else {
        chunks.push(content);
      }

      const insertKnowledgeStmt = db.prepare(`
        INSERT INTO knowledge_entries (
          feature_module, functionality, description, ui_elements,
          user_questions_en, user_questions_pt, category, content_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let entriesAdded = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunkSuffix = chunks.length > 1 ? ` (Part ${i + 1}/${chunks.length})` : '';
        await insertKnowledgeStmt.bind(
          'Uploaded Document',
          `${file.name}${chunkSuffix}`,
          `Content from uploaded file: ${file.name}${chunkSuffix}`,
          null,
          null,
          null,
          category,
          chunks[i]
        ).run();
        entriesAdded++;
      }

      // Update file record with success
      await db.prepare(`
        UPDATE uploaded_files 
        SET processing_status = 'completed', extraction_result = ?
        WHERE id = ?
      `).bind(`Successfully extracted ${content.length} characters`, fileId).run();

      return {
        success: true,
        message: `File uploaded and processed successfully. ${entriesAdded} knowledge entries created.`,
        entriesAdded,
      };
    } catch (error) {
      console.error('File upload and processing error:', error);
      return {
        success: false,
        message: 'Failed to upload and process file. Please try again.',
      };
    }
  }
}
