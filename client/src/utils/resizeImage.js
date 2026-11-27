export const MAX_PRODUCT_IMAGE_DIMENSION = 2000;

export const getCappedDimensions = (width, height, maxDimension = MAX_PRODUCT_IMAGE_DIMENSION) => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened"));
    };
    image.src = url;
  });

export async function resizeImageToLimit(file, maxDimension = MAX_PRODUCT_IMAGE_DIMENSION) {
  const image = await loadImage(file);
  const dimensions = getCappedDimensions(image.naturalWidth, image.naturalHeight, maxDimension);
  if (dimensions.width === image.naturalWidth && dimensions.height === image.naturalHeight) return file;

  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image resizing is not supported by this browser");

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, 0.9));
  if (!blob) throw new Error("This image could not be resized");

  return new File([blob], file.name, {
    type: blob.type || file.type,
    lastModified: file.lastModified,
  });
}
