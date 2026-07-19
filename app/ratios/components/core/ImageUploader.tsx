
'use client';

import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type React from 'react';
import { useState } from 'react';

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string, file: File) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF).');
        return;
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Maximum size is 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string, file);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden file input that we'll trigger programmatically */}
      <Input
        id="face-image-upload"
        type="file"
        accept="image/jpeg, image/png, image/webp, image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* This is the only visible button for the user to interact with. */}
      {/* It's associated with the hidden input via its onClick handler. */}
      <Button 
        type="button" 
        onClick={() => document.getElementById('face-image-upload')?.click()} 
        variant="outline"
      >
        <Upload className="mr-2 h-4 w-4" /> Select Image
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Supported formats: JPEG, PNG, WebP, GIF. Max file size: 5MB.
      </p>
      <p className="flex items-center gap-1.5 text-xs text-white/45">
        <span aria-hidden>🔒</span>
        Your photo is processed entirely in your browser. It is never uploaded, sent, or stored on our servers or any cloud storage.
      </p>
    </div>
  );
}
