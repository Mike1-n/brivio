"use client";

import React, { useState, useEffect } from "react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export default function SafeImage({
  src,
  alt = "Image",
  className = "",
  fallbackSrc,
  ...props
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || "");
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || "");
    setHasTriedProxy(false);
    setHasFailed(false);
  }, [src]);

  if (!currentSrc || hasFailed) {
    if (fallbackSrc) {
      return (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          referrerPolicy="no-referrer"
          {...props}
        />
      );
    }
    return null;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        // If external URL failed to load directly (due to CORS/hotlink protection), proxy it through our server
        if (!hasTriedProxy && currentSrc.startsWith("http") && !currentSrc.includes("/api/proxy-image")) {
          setHasTriedProxy(true);
          setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(currentSrc)}`);
        } else {
          setHasFailed(true);
        }
      }}
      {...props}
    />
  );
}
