import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

// Single S3 client. When explicit keys are present (dev / non-IAM) they're
// used; otherwise the SDK's default credential chain applies (IAM role on EC2).
export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined,
});
