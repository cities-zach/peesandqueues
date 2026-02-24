import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function JoinTrip() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/join/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.tripId) setTrip(data);
        else if (!cancelled) setTrip(null);
      })
      .catch(() => !cancelled && setTrip(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${trip.tripId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not join');
      sessionStorage.setItem(`trip:${trip.tripId}:participantId`, data.participantId);
      navigate(`/trip/${trip.tripId}`, { replace: true, state: { participantId: data.participantId } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLayout><div className="flex items-center justify-center min-h-[40vh] text-[#7d6b8a]">Loading…</div></PageLayout>;
  if (!trip) return <PageLayout><div className="flex items-center justify-center min-h-[40vh] text-[#7d6b8a]">Invalid or expired invite link.</div></PageLayout>;

  return (
    <PageLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-[#5a4a6a] mb-1">Join {trip.tripName}</h1>
        <p className="text-[#7d6b8a] text-sm mb-6">Enter your name and phone to join the trip. You'll use SMS to join bathroom queues.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[#7d6b8a] text-sm mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              className="w-full rounded-xl bg-white/80 border border-[#e5dfed] text-[#5a4a6a] px-3 py-2 focus:ring-2 focus:ring-[#f4a6b8] placeholder:text-[#7d6b8a]"
            />
          </div>
          <div>
            <label className="block text-[#7d6b8a] text-sm mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full rounded-xl bg-white/80 border border-[#e5dfed] text-[#5a4a6a] px-3 py-2 focus:ring-2 focus:ring-[#f4a6b8] placeholder:text-[#7d6b8a]"
            />
          </div>
          {error && <p className="text-[#f4a6b8] text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-3 hover:bg-[#fad4dc] transition disabled:opacity-50">
            {submitting ? 'Joining…' : 'Join trip'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
