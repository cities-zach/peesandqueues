import { Link } from 'react-router-dom';

/** size: 'hero' for home (large center), 'corner' for other pages */
export default function Logo({ size = 'corner' }) {
  const isHero = size === 'hero';
  const img = (
    <img
      src="/logo.png"
      alt="Pees & Queues"
      className={isHero ? 'w-80 max-w-[90vw] h-auto' : 'h-14 w-auto'}
    />
  );
  return isHero ? (
    <div className="flex justify-center mb-8">{img}</div>
  ) : (
    <Link to="/" className="inline-block shrink-0" aria-label="Pees & Queues home">
      {img}
    </Link>
  );
}
