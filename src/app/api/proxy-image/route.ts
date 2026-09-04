import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return NextResponse.json({ error: "Invalid or missing image URL" }, { status: 400 });
  }

  try {
    const cleanUrl = targetUrl.trim();
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    let finalResponse = response;
    if (!finalResponse.ok && cleanUrl.includes("upload.wikimedia.org") && cleanUrl.includes("/thumb/")) {
      const nonThumb = cleanUrl.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
      const retryRes = await fetch(nonThumb, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/*,*/*",
        },
        redirect: "follow",
      });
      if (retryRes.ok) {
        finalResponse = retryRes;
      }
    }

    if (!finalResponse.ok) {
      return NextResponse.json(
        { error: `Remote image returned status ${finalResponse.status}` },
        { status: finalResponse.status }
      );
    }

    const responseToUse = finalResponse;
    const contentType = responseToUse.headers.get("content-type") || "image/jpeg";

    // If the URL actually returned an HTML page (e.g., user pasted a webpage link instead of image link)
    if (contentType.includes("text/html")) {
      const htmlText = await responseToUse.text();
      // Look for og:image or twitter:image
      const ogMatch =
        htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        htmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
        htmlText.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        let ogImageUrl = ogMatch[1];
        if (ogImageUrl.startsWith("/")) {
          const origin = new URL(cleanUrl).origin;
          ogImageUrl = `${origin}${ogImageUrl}`;
        }
        // Fetch the actual image found in the page meta tags
        const imgRes = await fetch(ogImageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "image/*,*/*",
          },
        });
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const imgType = imgRes.headers.get("content-type") || "image/jpeg";
          return new NextResponse(imgBuffer, {
            headers: {
              "Content-Type": imgType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      }
      return NextResponse.json({ error: "The provided URL is a web page, not a direct image" }, { status: 400 });
    }

    const arrayBuffer = await responseToUse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Proxy image error:", error);
    return NextResponse.json({ error: error.message || "Failed to proxy image" }, { status: 500 });
  }
}
