import Logo from './Logo';

/** Wraps non-home pages with corner logo and consistent layout */
export default function PageLayout({ children }) {
  return (
    <div className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <Logo size="corner" />
      </header>
      <main>{children}</main>
    </div>
  );
}
