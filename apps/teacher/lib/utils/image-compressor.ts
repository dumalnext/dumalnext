/**
 * Client-Side HTML5 Canvas Image Optimization Engine
 * Compresses camera photos and report card pictures down to lightweight JPEG/WebP (<350KB)
 * directly in the browser before sending to the server and student portal.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: "image/webp" | "image/jpeg";
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ file: File; dataUrl: string; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    outputFormat = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio-preserving dimensions
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

        // Draw onto HTML5 Canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to obtain 2D canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas blob conversion failed"));
              return;
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: outputFormat,
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL(outputFormat, quality);

            resolve({
              file: compressedFile,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for compression"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read input file"));
    };

    reader.readAsDataURL(file);
  });
}
