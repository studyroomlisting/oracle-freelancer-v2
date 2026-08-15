import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// STORAGE ADAPTER — dual mode, chosen automatically at runtime.
//
// If S3_BUCKET (+ S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are set,
// uploads go to S3 — or any S3-compatible service (Cloudflare R2, Supabase
// Storage, Backblaze B2, MinIO) by also setting S3_ENDPOINT. This is real,
// working code, not a stub — it just needs real credentials in .env to
// activate. Without those env vars, it falls back to local disk
// (/public/uploads), which is fine for local dev but NOT for Vercel/other
// serverless platforms (read-only/ephemeral filesystem at runtime).
//
// Every caller only depends on the { url } return shape, regardless of
// which mode is active.

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Resumes (Milestone 2 onboarding) — a different policy from images: PDF
// only, and a larger size ceiling since a real CV with formatting/images
// embedded is often bigger than a profile photo.
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_RESUME_MIME_TYPES = ["application/pdf"];
// FIXED (Milestone 9 gap): chat attachments — explicitly out of scope
// until now. Accepts either an image or a PDF (covers the milestone's
// "Images" and "Documents" scope items in one policy, since a chat
// attachment is naturally either-or, not both at once per message).
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// FIXED (Post Requirement expansion): screenshots, videos, and log files
// attached when posting a requirement — broader than the chat-attachment
// policy above (adds video and plain-text log files), and a larger size
// ceiling since a screen-recording video is often much bigger than a
// screenshot or PDF.
const MAX_REQUIREMENT_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_REQUIREMENT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "text/plain",
  "text/csv",
];

export class UploadError extends Error {}

function isS3Configured(): boolean {
  return !!(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

async function saveToS3(buffer: Buffer, filename: string, subfolder: string, contentType: string): Promise<{ url: string }> {
  // Lazy import so the AWS SDK is only loaded when actually needed.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT, // set for R2/Supabase/MinIO/etc; omit for real AWS S3
    forcePathStyle: !!process.env.S3_ENDPOINT, // most S3-compatible providers need this
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

  const key = `${subfolder}/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const publicBaseUrl = process.env.S3_PUBLIC_URL_BASE; // e.g. https://your-bucket.s3.eu-west-2.amazonaws.com or your R2/CDN domain
  const url = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/${key}` : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

  return { url };
}

async function saveToLocalDisk(buffer: Buffer, filename: string, subfolder: string): Promise<{ url: string }> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/${subfolder}/${filename}` };
}

export async function saveUploadedFile(file: File, subfolder: "gigs" | "avatars" | "resumes" | "portfolio" | "messages" | "requirements" | "workspace-documents"): Promise<{ url: string }> {
  const isResume = subfolder === "resumes";
  const isMessageAttachment = subfolder === "messages";
  // FIXED (real gap found during review): reuses the exact same sensible
  // document-type restrictions already established for requirement
  // attachments (images/PDFs/videos/text-CSV) — workspace documents are
  // the same kind of content, just stored in a different folder.
  const isRequirementAttachment = subfolder === "requirements" || subfolder === "workspace-documents";
  const allowedTypes = isResume
    ? ALLOWED_RESUME_MIME_TYPES
    : isMessageAttachment
      ? ALLOWED_ATTACHMENT_MIME_TYPES
      : isRequirementAttachment
        ? ALLOWED_REQUIREMENT_ATTACHMENT_MIME_TYPES
        : ALLOWED_IMAGE_MIME_TYPES;
  const maxSize = isResume
    ? MAX_RESUME_SIZE_BYTES
    : isMessageAttachment
      ? MAX_ATTACHMENT_SIZE_BYTES
      : isRequirementAttachment
        ? MAX_REQUIREMENT_ATTACHMENT_SIZE_BYTES
        : MAX_IMAGE_SIZE_BYTES;

  if (!allowedTypes.includes(file.type)) {
    throw new UploadError(
      isResume
        ? "Only PDF files are allowed for a resume."
        : isMessageAttachment
          ? "Only JPEG, PNG, WebP images or PDF files are allowed."
          : isRequirementAttachment
            ? "Only images, PDFs, videos (MP4/MOV/WebM), or plain-text/CSV log files are allowed."
            : "Only JPEG, PNG, or WebP images are allowed."
    );
  }
  if (file.size > maxSize) {
    throw new UploadError(isRequirementAttachment ? "Files must be under 50MB." : isResume || isMessageAttachment ? "Files must be under 10MB." : "Images must be under 5MB.");
  }

  const ext =
    file.type === "application/pdf" ? "pdf"
    : file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : file.type === "video/mp4" ? "mp4"
    : file.type === "video/quicktime" ? "mov"
    : file.type === "video/webm" ? "webm"
    : file.type === "text/csv" ? "csv"
    : file.type === "text/plain" ? "log"
    : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isS3Configured()) {
    return saveToS3(buffer, filename, subfolder, file.type);
  }
  return saveToLocalDisk(buffer, filename, subfolder);
}

// Exposed for health checks / admin diagnostics if you want to confirm which
// mode is active without triggering a real upload.
export function getActiveStorageMode(): "s3" | "local-disk" {
  return isS3Configured() ? "s3" : "local-disk";
}
