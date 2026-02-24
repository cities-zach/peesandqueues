import { useState } from 'react';

const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator;

export default function ContactPickerButton({ onSelect }) {
  const [error, setError] = useState('');
  if (!hasContactPicker) return null;

  const pick = async () => {
    setError('');
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const picked = contacts.map((c) => ({ name: c.name?.join?.(' ') ?? c.name ?? '', phone: c.tel?.[0] ?? '' })).filter((p) => p.phone || p.name);
      if (picked.length) onSelect(picked);
    } catch (err) {
      if (err.name !== 'SecurityError') setError('Could not open contacts.');
    }
  };

  return (
    <div>
      <button type="button" onClick={pick} className="text-[#f4a6b8] hover:text-[#c4b5d4] font-medium text-sm">
        Invite from Contacts
      </button>
      {error && <p className="text-[#f4a6b8] text-xs mt-1">{error}</p>}
    </div>
  );
}
