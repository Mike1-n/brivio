/**
 * Security & Anti-Penetration Utilities
 * - SSRF Protection
 * - XSS & HTML Input Sanitization
 * - Safe URL Validation
 * - Password Strength Enforcement
 */

/**
 * Validates whether a given URL is safe for server-side fetching (SSRF Protection).
 * Blocks loopback, RFC1918 private subnets, cloud metadata services (169.254.169.254),
 * non-HTTP protocols, and localhost aliases.
 */
export function isSafePublicUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow standard HTTP / HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 1. Block Localhost and common local hostnames
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".lan") ||
      hostname === "broadcasthost"
    ) {
      return false;
    }

    // 2. Check for IPv4 and IPv6 loopback / private / cloud metadata ranges
    // Strip brackets from IPv6 if present
    const cleanHost = hostname.replace(/^\[|\]$/g, "");

    // IPv6 checks
    if (
      cleanHost === "::1" ||
      cleanHost === "0:0:0:0:0:0:0:1" ||
      cleanHost.startsWith("fe80:") || // Link-local
      cleanHost.startsWith("fc00:") || // Unique local address
      cleanHost.startsWith("fd00:")
    ) {
      return false;
    }

    // IPv4 checks
    const ipv4Match = cleanHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      // 0.0.0.0/8 (Broadcast/Current network)
      if (octet1 === 0) return false;

      // 127.0.0.0/8 (Loopback addresses)
      if (octet1 === 127) return false;

      // 10.0.0.0/8 (Private Class A)
      if (octet1 === 10) return false;

      // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;

      // 192.168.0.0/16 (Private Class C)
      if (octet1 === 192 && octet2 === 168) return false;

      // 169.254.0.0/16 (Link-local & AWS/GCP/Azure instance metadata service 169.254.169.254)
      if (octet1 === 169 && octet2 === 254) return false;

      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (octet1 >= 224) return false;
    }

    // 3. Reject hex, octal, or integer IP obfuscation (e.g. 0x7f000001, 2130706433)
    if (/^0x[0-9a-f]+$/i.test(cleanHost) || /^\d+$/.test(cleanHost)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes strings by stripping dangerous HTML tags, inline scripts, event handlers (onerror, onload, etc.),
 * and converts HTML entities to prevent Cross-Site Scripting (XSS).
 */
export function sanitizeInput(str: string): string {
  if (!str || typeof str !== "string") return "";

  return str
    // Strip explicit script, iframe, object, embed tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    // Strip inline event handlers like onclick=, onerror=, onload=
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    // Strip javascript: and data: URIs
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    // Escape essential HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Sanitizes plain text where HTML isn't expected (e.g. nicknames, quiz titles)
 */
export function sanitizePlainText(str: string, maxLength = 100): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/[<>'"&]/g, "") // remove HTML control characters directly
    .trim()
    .substring(0, maxLength);
}

/**
 * Validates password strength (minimum 6 characters, rejects blank/empty strings)
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password cannot exceed 128 characters" };
  }
  return { valid: true };
}
