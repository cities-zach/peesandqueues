import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <Logo size="hero" />
      <p className="text-[#7d6b8a] mb-8 text-center">Bathroom queue coordination for trips</p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          to="/create"
          className="rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-3 px-4 text-center hover:bg-[#fad4dc] transition shadow-sm"
        >
          Create a trip
        </Link>
        <p className="text-[#7d6b8a] text-sm text-center">or open an invite link from your host to join</p>
      </div>
    </div>
  );
}
