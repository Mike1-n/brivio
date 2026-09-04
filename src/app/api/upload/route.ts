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
      const { data, url } = body;

      if (url && typeof url === "string" && url.startsWith("http")) {
        let cleanUrl = url.trim();

        // Check if user pasted a Google Images search URL containing imgurl parameter
        try {
          const parsed = new URL(cleanUrl);
          const imgParam = parsed.searchParams.get("imgurl");
          if (imgParam) {
            cleanUrl = imgParam;
          }
        } catch (_) {}

        const remoteRes = await fetch(cleanUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
          redirect: "follow",
        });

        if (!remoteRes.ok) {
          return NextResponse.json(
            { error: `Remote image returned error status (${remoteRes.status})` },
            { status: 400 }
          );
        }

        let fetchedContentType = remoteRes.headers.get("content-type") || "image/jpeg";

        // If webpage URL, attempt to extract og:image
        if (fetchedContentType.includes("text/html")) {
          const htmlText = await remoteRes.text();
          const ogMatch =
            htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            htmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
            htmlText.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

          if (ogMatch && ogMatch[1]) {
            let ogUrl = ogMatch[1];
            if (ogUrl.startsWith("/")) {
              const origin = new URL(cleanUrl).origin;
              ogUrl = `${origin}${ogUrl}`;
            }
            const secondRes = await fetch(ogUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                Accept: "image/*,*/*",
              },
            });
            if (secondRes.ok) {
              const imgBuf = await secondRes.arrayBuffer();
              buffer = Buffer.from(imgBuf);
              fetchedContentType = secondRes.headers.get("content-type") || "image/jpeg";
            } else {
              return NextResponse.json({ error: "The provided link is a web page, not an image" }, { status: 400 });
            }
          } else {
            return NextResponse.json({ error: "The provided link is a web page, not an image" }, { status: 400 });
          }
        } else {
          const imgBuf = await remoteRes.arrayBuffer();
          buffer = Buffer.from(imgBuf);
        }

        if (fetchedContentType.includes("png")) {
          extension = "png";
          mimeType = "image/png";
        } else if (fetchedContentType.includes("webp")) {
          extension = "webp";
          mimeType = "image/webp";
        } else if (fetchedContentType.includes("gif")) {
          extension = "gif";
          mimeType = "image/gif";
        } else if (fetchedContentType.includes("svg")) {
          extension = "svg";
          mimeType = "image/svg+xml";
        } else {
          extension = "jpg";
          mimeType = "image/jpeg";
        }
      } else if (data) {
        const matches = data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          extension = matches[1] === "jpeg" ? "jpg" : matches[1];
          mimeType = `image/${matches[1]}`;
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(data, "base64");
        }
      } else {
        return NextResponse.json({ error: "No image data or URL provided" }, { status: 400 });
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
