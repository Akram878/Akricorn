export type ImageDimensions = {
  width: number;
  height: number;
};

export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      cleanup();
      resolve({ width: image.width, height: image.height });
    };

    image.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image.'));
    };

    image.src = objectUrl;
  });
};
