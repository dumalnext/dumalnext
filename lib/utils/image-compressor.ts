/**
 * Client-Side HTML5 Canvas Image Optimization Engine
 * Based on Dumal-NEXT System Architecture (Activity 5):
 * Resizes and compresses high-resolution camera photos/documents (often 15MB+)
 * down to lightweight WebP/JPEG (<350KB) directly in the browser.
 * Reduces bandwidth consumption for students in far-flung rural barangays of Dumalneg.
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
    quality = 0.75,
    outputFormat = "image/webp",
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

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed blob and dataUrl
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas blob conversion failed"));
              return;
            }

            const extension = outputFormat === "image/webp" ? ".webp" : ".jpg";
            const compressedFilename = file.name.replace(/\.[^/.]+$/, "") + extension;
            const compressedFile = new File([blob], compressedFilename, {
              type: outputFormat,
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL(outputFormat, quality);

            resolve({
              file: compressedFile,
              dataUrl,
              originalSize: file.size,
              compressedSize: compressedFile.size,
            });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image into memory"));
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed to read document"));
    };

    reader.readAsDataURL(file);
  });
}
