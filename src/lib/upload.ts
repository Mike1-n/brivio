export async function uploadImageFile(file: File): Promise<string> {
  const compressedBase64 = await compressImage(file);
  
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: compressedBase64 }),
    });
    const data = await res.json();
    if (data.url) {
      return data.url;
    }
  } catch (e) {
    console.error("Upload API failed, fallback to compressed base64:", e);
  }
  return compressedBase64;
}

export async function uploadImageUrl(url: string): Promise<string> {
  const cleanUrl = url.trim().replace(/^["']|["']$/g, "");
  if (!cleanUrl.startsWith("http")) return cleanUrl;

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl }),
    });
    const data = await res.json();
    if (data.url) {
      return data.url;
    }
  } catch (e) {
    console.warn("Upload URL failed, falling back to direct URL:", e);
  }
  return cleanUrl;
}

export function getSafeImageUrl(url?: string | null): string {
  if (!url) return "";
  const clean = url.trim().replace(/^["']|["']$/g, "");
  return clean;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = () => resolve("");
  });
}

