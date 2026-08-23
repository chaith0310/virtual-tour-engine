export type PanoramaValidationResult = {
  valid: boolean;
  width?: number;
  height?: number;
  message?: string;
};

const MAX_FILE_SIZE =
  80 * 1024 * 1024;

export async function validatePanoramaFile(
  file: File,
): Promise<PanoramaValidationResult> {
  if (
    file.type !== "image/jpeg" &&
    file.type !== "image/png"
  ) {
    return {
      valid: false,
      message:
        "Upload a JPG or PNG panorama.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message:
        "The panorama exceeds the 80 MB client-side MVP limit.",
    };
  }

  const temporaryUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await loadImage(
        temporaryUrl,
      );

    const ratio =
      image.naturalWidth /
      image.naturalHeight;

    const ratioDifference =
      Math.abs(ratio - 2);

    if (ratioDifference > 0.03) {
      return {
        valid: false,
        width:
          image.naturalWidth,
        height:
          image.naturalHeight,

        message:
          `Expected a 2:1 equirectangular panorama. Received ${image.naturalWidth} × ${image.naturalHeight}.`,
      };
    }

    return {
      valid: true,
      width:
        image.naturalWidth,
      height:
        image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(
      temporaryUrl,
    );
  }
}

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "The browser could not decode this image.",
          ),
        );

      image.src = source;
    },
  );
}