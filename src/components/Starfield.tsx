// Pure CSS Starfield — no client JS, no CLS, no hydration cost
// Stars are generated via CSS pseudo-elements and box-shadow

// Pre-computed star positions as box-shadow values (avoids runtime Math.random)
const TINY_STARS = '423px 89px #fff,847px 234px #fff,112px 567px #fff,634px 123px #fff,289px 445px #fff,756px 678px #fff,45px 234px #fff,523px 789px #fff,167px 345px #fff,890px 56px #fff,334px 678px #fff,678px 901px #fff,201px 123px #fff,567px 456px #fff,789px 234px #fff,23px 678px #fff,456px 890px #fff,890px 345px #fff,123px 789px #fff,678px 12px #fff,345px 234px #fff,901px 567px #fff,56px 890px #fff,234px 12px #fff,789px 456px #fff,12px 345px #fff,567px 678px #fff,345px 901px #fff,678px 234px #fff,123px 567px #fff,890px 789px #fff,456px 34px #fff,234px 890px #fff,34px 456px #fff,789px 789px #fff,456px 123px #fff,678px 567px #fff,123px 234px #fff,567px 345px #fff,890px 678px #fff,234px 456px #fff,345px 789px #fff,678px 890px #fff,56px 123px #fff,789px 345px #fff,423px 678px #fff,890px 901px #fff,123px 456px #fff,567px 789px #fff,234px 234px #fff,345px 567px #fff,678px 345px #fff,789px 890px #fff,456px 678px #fff,901px 123px #fff';

const MEDIUM_STARS = '156px 423px #fff,589px 67px #fff,823px 345px #fff,67px 789px #fff,345px 156px #fff,712px 534px #fff,234px 867px #fff,478px 23px #fff,901px 456px #fff,123px 678px #fff,567px 234px #fff,834px 789px #fff,23px 345px #fff,456px 567px #fff,789px 123px #fff,345px 890px #fff,678px 456px #fff,890px 234px #fff';

const BRIGHT_STARS = '234px 345px #fff,678px 123px #fff,456px 789px #fff,890px 456px #fff,123px 890px #fff,567px 567px #fff,789px 234px #fff';

export default function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {/* Tiny stars (1px) */}
      <div
        className="star-layer star-layer-tiny"
        style={{ boxShadow: TINY_STARS }}
      />
      {/* Medium stars (2px) */}
      <div
        className="star-layer star-layer-medium"
        style={{ boxShadow: MEDIUM_STARS }}
      />
      {/* Bright stars (3px with glow) */}
      <div
        className="star-layer star-layer-bright"
        style={{ boxShadow: BRIGHT_STARS }}
      />
      {/* Nebula blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          top: '20%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(76, 29, 149, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          top: '60%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '350px',
          height: '350px',
          bottom: '10%',
          left: '40%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
