'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react'

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve) => { image.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92)
  })
}

export default function CropModal({
  imageSrc,
  onSave,
  onCancel,
  saving,
}: {
  imageSrc: string
  onSave: (blob: Blob) => void
  onCancel: () => void
  saving: boolean
}) {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 })
  const [zoom,       setZoom]       = useState(1)
  const [pixelCrop,  setPixelCrop]  = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, pxCrop: Area) => {
    setPixelCrop(pxCrop)
  }, [])

  const handleSave = async () => {
    if (!pixelCrop) return
    const blob = await getCroppedBlob(imageSrc, pixelCrop)
    onSave(blob)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div className="w-full max-w-md px-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Crop Photo</p>
          <p className="text-xs text-white/35 mt-0.5">Drag to reposition · scroll to zoom</p>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Crop area */}
      <div
        className="relative w-80 h-80 rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#0a0a0f' },
            cropAreaStyle: { border: '2px solid #6366f1', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="w-80 mt-5 flex items-center gap-3">
        <ZoomOut className="w-4 h-4 text-white/30 flex-shrink-0" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#6366f1' }}
        />
        <ZoomIn className="w-4 h-4 text-white/30 flex-shrink-0" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !pixelCrop}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
            : <><Check className="w-4 h-4" />Save Photo</>
          }
        </button>
      </div>
    </div>
  )
}
