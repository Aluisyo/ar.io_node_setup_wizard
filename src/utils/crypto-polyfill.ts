// Polyfill for crypto APIs when not available (HTTP contexts)

// Simple UUID v4 generator fallback
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Polyfill crypto.randomUUID if not available
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  (window.crypto as any).randomUUID = generateUUID;
}

// Polyfill crypto object if not available
if (typeof window !== 'undefined' && !window.crypto) {
  (window as any).crypto = {
    randomUUID: generateUUID,
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
}

export {};
