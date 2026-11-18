// The three trust signals, in one place so every page shows them the same way.
//   ★ Trusted           approved by an EZTAP admin
//   ✔ Verified          Google or email verified
//   🤝 Community trusted 2+ vouches (1 vouch shows as "1 vouch")
export default function Badges({ trusted, verified, vouchCount = 0, showUnverified = false }) {
  return (
    <>
      {trusted && <span className="badge trusted-b">★ Trusted</span>}
      {verified && <span className="badge verified-b">✔ Verified</span>}
      {!verified && showUnverified && <span className="badge unverified-b">Not verified</span>}
      {vouchCount >= 2 && <span className="badge community-b">🤝 Community trusted · {vouchCount}</span>}
      {vouchCount === 1 && <span className="badge community-b">🤝 1 vouch</span>}
    </>
  );
}

// Used to sort applicants: most trusted first.
export function trustScore({ trusted, verified, vouchCount = 0 }) {
  return (trusted ? 4 : 0) + (vouchCount >= 2 ? 2 : 0) + (verified ? 1 : 0);
}
