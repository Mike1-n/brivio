import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { supabase } from "@/lib/supabase";
import { uploadToR2, isR2Configured } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let buffer: Buffer;
    let extension = "jpg";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);

      if (file.type.includes("png")) {
        extension = "png";
        mimeType = "image/png";
      } else if (file.type.includes("webp")) {
        extension = "webp";
        mimeType = "image/webp";
      } else if (file.type.includes("gif")) {
        extension = "gif";
        mimeType = "image/gif";
      } else {
        extension = "jpg";
        mimeType = "image/jpeg";
      }
    } else {
      const body = await req.json();
      const { data } = body;
      if (!data) {
        return NextResponse.json({ error: "No image data provided" }, { status: 400 });
      }

      const matches = data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        extension = matches[1] === "jpeg" ? "jpg" : matches[1];
        mimeType = `image/${matches[1]}`;
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(data, "base64");
      }
    }

    const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;

    // 1. Cloudflare R2 (10 GB Free tier, $0 Egress/Bandwidth)
    if (isR2Configured) {
      try {
        const r2Url = await uploadToR2(uniqueName, buffer, mimeType);
        if (r2Url) {
          return NextResponse.json({ url: r2Url, success: true, storage: "cloudflare_r2" });
        }
      } catch (err) {
        console.warn("[Storage] Cloudflare R2 upload failed, checking fallbacks:", err);
      }
    }

    // 2. Supabase Storage Bucket ('quiz-images')
    if (supabase) {
      try {
        const bucketName = "quiz-images";
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(uniqueName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uniqueName);

          if (publicUrlData?.publicUrl) {
            return NextResponse.json({ url: publicUrlData.publicUrl, success: true, storage: "supabase" });
          }
        } else {
          console.warn("Supabase bucket upload error, falling back to local storage:", uploadError.message);
        }
      } catch (err) {
        console.warn("Supabase storage exception, falling back to local:", err);
      }
    }

    // 3. Local disk fallback storage
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    return NextResponse.json({ url: publicUrl, success: true, storage: "local" });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
