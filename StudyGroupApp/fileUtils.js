export function getMimeType(filename) {
    const extension = getFileExtension(filename).toLowerCase();
    
    const mimeTypes = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      
      // Video
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      
      // Default
      default: 'application/octet-stream'
    };
  
    return mimeTypes[extension] || mimeTypes.default;
  }
  
  export function getFileExtension(filename) {
    return filename.split('.').pop();
  }