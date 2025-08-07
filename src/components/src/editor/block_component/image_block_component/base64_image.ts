/// Base64 image utilities for handling image data conversion

export interface ImageElement {
  src: string;
  width?: number;
  height?: number;
}

export function imageFromBase64String(base64String: string, width?: number): ImageElement {
  return {
    src: `data:image/png;base64,${base64String}`,
    width,
  };
}

export function dataFromBase64String(base64String: string): Uint8Array {
  // Remove data URL prefix if present
  const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Convert base64 to binary string
  const binaryString = atob(cleanBase64);
  
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

export function base64String(data: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binaryString = '';
  for (let i = 0; i < data.length; i++) {
    binaryString += String.fromCharCode(data[i]);
  }
  
  // Convert binary string to base64
  return btoa(binaryString);
}

export async function base64StringFromImage(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      // Get base64 string without data URL prefix
      const dataURL = canvas.toDataURL('image/png');
      const base64 = dataURL.split(',')[1];
      
      resolve(base64);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };
    
    img.src = imagePath;
  });
}

export async function base64StringFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}