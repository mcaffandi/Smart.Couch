import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

export default function ImageCropperModal({ imageSrc, onComplete, onClose, lang = 'id' }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(croppedImage); // base64 string
    } catch (e) {
      console.error(e);
      alert('Gagal memotong gambar');
    }
  };

  return (
    <div className="profile-modal-backdrop" style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.85)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{lang === 'id' ? 'Sesuaikan Foto' : 'Crop Photo'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, fontSize: 20 }}>✕</button>
        </div>
        
        <div style={{ position: 'relative', width: '100%', height: 350, background: '#111' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div style={{ padding: 20 }}>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            style={{ width: '100%', marginBottom: 20, accentColor: 'var(--accent-purple)' }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>{lang === 'id' ? 'Batal' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1, background: 'var(--accent-purple)', color: '#fff', border: 'none' }}>{lang === 'id' ? 'Simpan' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set canvas size to the cropped size (or max 400x400 to save space)
  const MAX_SIZE = 400;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > MAX_SIZE) {
    targetHeight = targetHeight * (MAX_SIZE / targetWidth);
    targetWidth = MAX_SIZE;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Return Base64 (max quality jpeg, compressed slightly to save space)
  return canvas.toDataURL('image/jpeg', 0.85);
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}
