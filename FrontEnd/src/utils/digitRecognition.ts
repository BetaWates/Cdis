import { createWorker } from 'tesseract.js';

export interface RecognitionResult {
  text: string;
  confidence: number;
  isValid: boolean;
}

/**
 * Converts a base64 image with a potentially transparent background
 * into an image with a solid white background to maximize OCR accuracy.
 */
async function flattenImageWithWhiteBackground(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image); // Fallback to original image if context cannot be created
        return;
      }
      // Fill canvas with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw transparent base64 image on top
      ctx.drawImage(img, 0, 0);
      // Return as JPEG to ensure high contrast and no transparency
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image for preprocessing: ' + String(err)));
    };
    img.src = base64Image;
  });
}

/**
 * Performs digit recognition on a base64 PNG data URL using Tesseract.js.
 * Whitelists characters: 0-9, decimal point (.), and minus sign (-).
 */
export async function recognizeDigit(base64Image: string): Promise<RecognitionResult> {
  if (!base64Image || base64Image.trim() === '') {
    return { text: '', confidence: 0, isValid: false };
  }

  let worker: any = null;
  try {
    // 1. Preprocess the image to have a solid white background
    const processedImage = await flattenImageWithWhiteBackground(base64Image);

    // 2. Initialize Tesseract Worker
    worker = await createWorker('eng');

    // 3. Configure whitelist parameters
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.-',
    });

    // 4. Perform recognition
    const { data } = await worker.recognize(processedImage);
    const text = data.text.trim();
    const confidence = data.confidence;

    // 5. Validate the recognized text
    // Must be a valid numeric value matching whitelist pattern and confidence threshold (>= 50)
    const numericRegex = /^-?\d+(\.\d+)?$/;
    const isValid = numericRegex.test(text) && confidence >= 50;

    return {
      text,
      confidence,
      isValid,
    };
  } catch (error) {
    console.error('OCR recognition failed:', error);
    return { text: '', confidence: 0, isValid: false };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.error('Failed to terminate worker:', err);
      }
    }
  }
}
