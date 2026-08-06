import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse } from "@/server/auth/rbac";
import { storageService } from "@/server/storage/storage.service";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  try {
    const user = await requireRole("USER");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "A 'file' field is required (multipart/form-data)." } },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json(
        { error: { code: "FILE_TOO_LARGE", message: "Files must be 15MB or smaller." } },
        { status: 413 },
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Response.json(
        {
          error: {
            code: "UNSUPPORTED_FILE_TYPE",
            message: "Only PNG, JPEG, WEBP, and PDF files are supported in v0.1.",
          },
        },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storageService.save({ buffer, filename: file.name, mimeType: file.type });

    const record = await prisma.file.create({
      data: {
        userId: user.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey: stored.storageKey,
        storageUrl: stored.storageUrl,
      },
    });

    return Response.json(
      { id: record.id, filename: record.filename, mimeType: record.mimeType, sizeBytes: record.sizeBytes },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
