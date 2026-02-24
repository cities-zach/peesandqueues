import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import InviteLink from '../components/InviteLink';
import ContactPickerButton from '../components/ContactPickerButton';

export default function CreateTrip() {
  const [name, setName] = useState('');
  const [bathrooms, setBathrooms] = useState([{ name: '' }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [inviteContacts, setInviteContacts] = useState([]);

  const addBathroom = () => setBathrooms((b) => [...b, { name: '' }]);
  const removeBathroom = (i) => setBathrooms((b) => b.filter((_, idx) => idx !== i));
  const setBathroomName = (i, value) => setBathrooms((b) => b.map((x, idx) => (idx === i ? { ...x, name: value } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const tripName = name.trim();
    const bathNames = bathrooms.map((b) => b.name.trim() || 'Bathroom').filter(Boolean);
    if (!tripName || bathNames.length === 0) {
      setError('Trip name and at least one bathroom required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tripName, bathrooms: bathNames.map((name) => ({ name })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trip');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-[#5a4a6a] mb-4">Trip created</h1>
          <p className="text-[#7d6b8a] mb-4">Share this link with everyone on the trip. They open it and enter their name and phone to join.</p>
          <div className="mb-4">
            <InviteLink url={result.inviteLink} />
          </div>
          <div className="mb-4">
            <ContactPickerButton onSelect={(contacts) => setInviteContacts(contacts)} />
            {inviteContacts.length > 0 && (
              <p className="text-[#7d6b8a] text-sm mt-2">Share the link above with: {inviteContacts.map((c) => c.name || c.phone).join(', ')}</p>
            )}
          </div>
          <Link to={`/trip/${result.tripId}`} className="inline-block rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-2 px-4 hover:bg-[#fad4dc] transition">
            View trip & queues
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#5a4a6a] mb-4">Create a trip</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[#7d6b8a] text-sm mb-1">Trip name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cabin weekend"
              className="w-full rounded-xl bg-white/80 border border-[#e5dfed] text-[#5a4a6a] px-3 py-2 focus:ring-2 focus:ring-[#f4a6b8] focus:border-transparent placeholder:text-[#7d6b8a]/70"
            />
          </div>
          <div>
            <label className="block text-[#7d6b8a] text-sm mb-1">Bathrooms</label>
            {bathrooms.map((b, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => setBathroomName(i, e.target.value)}
                  placeholder={`Bathroom ${i + 1}`}
                  className="flex-1 rounded-xl bg-white/80 border border-[#e5dfed] text-[#5a4a6a] px-3 py-2 placeholder:text-[#7d6b8a]/70"
                />
                <button type="button" onClick={() => removeBathroom(i)} className="text-[#7d6b8a] hover:text-[#f4a6b8] px-2">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addBathroom} className="text-[#c5e8b7] text-sm font-medium hover:underline">
              + Add bathroom
            </button>
          </div>
          {error && <p className="text-[#f4a6b8] text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-3 hover:bg-[#fad4dc] transition disabled:opacity-50">
            {loading ? 'Creating…' : 'Create trip'}
          </button>
        </form>
        <Link to="/" className="block mt-4 text-[#7d6b8a] hover:text-[#5a4a6a] text-sm">
          Back home
        </Link>
      </div>
    </PageLayout>
  );
}
