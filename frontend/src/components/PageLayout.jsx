import { Link } from 'react-router-dom';
import Logo from './Logo';

/** Wraps non-home pages with corner logo and consistent layout */
export default function PageLayout({ children }) {
  return (
    <div className="min-h-screen p-6 flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <Logo size="corner" />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-8 pt-6 border-t border-[#e5dfed]">
        <Link to="/about" className="text-[#7d6b8a] hover:text-[#5a4a6a] text-sm">
          About Pees and Queues
        </Link>
      </footer>
    </div>
  );
}
