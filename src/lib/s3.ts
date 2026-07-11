import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export const s3Service = {
  /**
   * Upload a buffer to S3
   */
  async upload(
    key: string,
    body: Buffer,
    options: Partial<PutObjectCommandInput> = {},
  ): Promise<string> {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ...options,
      }),
    );
    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
    logger.debug({ key }, 'S3: File uploaded');
    return url;
  },

  /**
   * Generate a presigned GET URL for temporary access
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Delete an object from S3
   */
  async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.debug({ key }, 'S3: File deleted');
  },

  /**
   * Check if an object exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Build S3 key for a recording
   */
  recordingKey(orgId: string, callId: string, filename: string): string {
    return `${process.env.AWS_S3_RECORDINGS_PREFIX ?? 'recordings/'}${orgId}/${callId}/${filename}`;
  },

  /**
   * Build S3 key for a knowledge document
   */
  documentKey(orgId: string, employeeId: string, filename: string): string {
    return `${process.env.AWS_S3_DOCUMENTS_PREFIX ?? 'documents/'}${orgId}/${employeeId}/${filename}`;
  },
};
