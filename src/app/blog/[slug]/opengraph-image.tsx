import { ImageResponse } from 'next/og';
import { getBlogPost } from '@/lib/blog-content';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);

  const title = post?.title || 'SpaceNexus Blog';
  const category = post?.category?.toUpperCase() || 'BLOG';
  const author = post?.author || 'SpaceNexus Team';
  const readingTime = post?.readingTime ? `${post.readingTime} min read` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: Branding + Category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: 'white',
                fontWeight: 700,
              }}
            >
              S
            </div>
            <span style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 600 }}>SpaceNexus</span>
          </div>
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '20px',
              padding: '6px 16px',
              color: '#c4b5fd',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            {category}
          </div>
        </div>

        {/* Center: Title */}
        <div
          style={{
            fontSize: title.length > 60 ? '40px' : '48px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.2,
            maxWidth: '900px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>

        {/* Bottom: Author + Reading Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 500 }}>{author}</span>
          {readingTime && (
            <>
              <span style={{ color: '#475569', fontSize: '18px' }}>|</span>
              <span style={{ color: '#94a3b8', fontSize: '18px' }}>{readingTime}</span>
            </>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
