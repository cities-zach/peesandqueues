import { useState } from 'react';

function fullUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return typeof window !== 'undefined' ? `${window.location.origin}${url.startsWith('/') ? url : '/' + url}` : url;
}

export default function InviteLink({ url, label = 'Invite link' }) {
  const [copied, setCopied] = useState(false);
  const resolved = fullUrl(url);
  const copy = () => {
    if (resolved && navigator.clipboard?.writeText(resolved)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="bg-white/80 rounded-xl p-4 border border-[#e5dfed]">
      <label className="text-[#7d6b8a] text-sm block mb-1">{label}</label>
      <input readOnly value={resolved} className="w-full bg-[#fdf8e9] text-[#c4b5d4] rounded-lg px-3 py-2 text-sm font-mono break-all border border-[#e5dfed]" />
      <button type="button" onClick={copy} className="mt-2 text-sm text-[#f4a6b8] hover:text-[#c4b5d4] font-medium">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
