/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validates if the file type is supported by Gemini (Images mainly for this demo).
 * We can also support text files by reading their content, but let's stick to images for visual attachment logic
 * and maybe simple text reading if needed.
 */
export const isImageFile = (file: File) => {
  return file.type.startsWith('image/');
};