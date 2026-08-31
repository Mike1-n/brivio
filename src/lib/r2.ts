import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "brivio-media";
const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN; // e.g. https://pub-xxx.r2.dev or https://media.yourdomain.com

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && publicDomain
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!r2Client || !isR2Configured) return null;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Format public URL
    const cleanDomain = publicDomain!.replace(/\/$/, "");
    return `${cleanDomain}/${key}`;
  } catch (error) {
    console.error("[Cloudflare R2] Upload error:", error);
    return null;
  }
}
