interface LogoPictureProps {
  alt?: string
  className?: string
}

const LogoPicture = ({
  alt = 'Pair Research Logo',
  className,
}: LogoPictureProps) => {
  return (
    <picture>
      <source srcSet="/images/logo.avif" type="image/avif" />
      <source srcSet="/images/logo.webp" type="image/webp" />
      <img
        src="/images/logo.jpeg"
        alt={alt}
        className={className}
        loading="lazy"
      />
    </picture>
  )
}

export default LogoPicture
