interface AvatarImageProps {
  src?: string | null
  alt?: string
  fallback?: string
}

export default function AvatarImage({ src, alt = '', fallback = '?' }: AvatarImageProps) {
  if (src?.startsWith('http') || src?.startsWith('data:')) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return <>{src || fallback}</>
}
