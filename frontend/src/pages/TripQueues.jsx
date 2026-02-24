import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import QueueList from '../components/QueueList';
import InviteLink from '../components/InviteLink';

export default function TripQueues() {
  const { tripId } = useParams();
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState(() => location.state?.participantId || sessionStorage.getItem(`trip:${tripId}:participantId`) || '');
  const [error, setError] = useState('');

  const fetchTrip = () => fetch(`/api/trips/${tripId}`).then((r) => r.json()).then(setTrip).catch(() => setTrip(null));
  const fetchQueues = () => fetch(`/api/trips/${tripId}/queues`).then((r) => r.json()).then(setQueues).catch(() => setQueues([]));

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTrip(), fetchQueues()]).finally(() => !cancelled && setLoading(false));
    const interval = setInterval(() => { if (!cancelled) fetchQueues(); }, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tripId]);

  const joinQueue = async (bathroomId) => {
    if (!participantId.trim()) { setError('Set your participant ID below (from when you joined).'); return; }
    setError('');
    try {
      const res = await fetch(`/api/trips/${tripId}/queues/${bathroomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participantId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      fetchQueues();
    } catch (err) {
      setError(err.message);
    }
  };

  const leaveQueue = async (bathroomId) => {
    if (!participantId.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/trips/${tripId}/queues/${bathroomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participantId.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      fetchQueues();
    } catch (err) {
      setError(err.message);
    }
  };

  const markDone = async (bathroomId) => {
    if (!participantId.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/trips/${tripId}/queues/${bathroomId}/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participantId.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      fetchQueues();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveParticipantId = (id) => {
    setParticipantId(id);
    sessionStorage.setItem(`trip:${tripId}:participantId`, id);
  };

  if (loading && !trip) return <PageLayout><div className="flex items-center justify-center min-h-[40vh] text-[#7d6b8a]">Loading…</div></PageLayout>;
  if (!trip?.id) return <PageLayout><div className="flex items-center justify-center min-h-[40vh] text-[#7d6b8a]">Trip not found.</div></PageLayout>;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#5a4a6a]">{trip.name}</h1>
          <Link to="/" className="text-[#7d6b8a] hover:text-[#5a4a6a] text-sm">Home</Link>
        </div>

        <p className="text-[#7d6b8a] text-sm mb-4">
          Text the trip number to JOIN, DONE, STATUS, or HELP. Queues update below every few seconds.
        </p>

        {error && <p className="text-[#f4a6b8] text-sm mb-4">{error}</p>}

        <div className="mb-6 p-3 bg-white/80 rounded-xl border border-[#e5dfed]">
          <label className="block text-[#7d6b8a] text-xs mb-1">Your participant ID (from join confirmation)</label>
          <input
            type="text"
            value={participantId}
            onChange={(e) => saveParticipantId(e.target.value)}
            placeholder="Paste UUID from join step"
            className="w-full bg-[#fdf8e9] text-[#5a4a6a] rounded-lg px-2 py-1 text-sm font-mono border border-[#e5dfed]"
          />
        </div>

        <div className="space-y-6">
          {queues.map((q) => (
            <QueueList
              key={q.queueId}
              queue={q}
              participantId={participantId}
              onJoin={joinQueue}
              onLeave={leaveQueue}
              onDone={markDone}
            />
          ))}
        </div>

        {trip.inviteToken && (
          <div className="mt-6">
            <p className="text-[#7d6b8a] text-sm mb-2">Invite link: share so others can join the trip.</p>
            <InviteLink url={trip.inviteToken ? `/join/${trip.inviteToken}` : ''} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
