import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import QueueList from '../components/QueueList';
import InviteLink from '../components/InviteLink';

export default function TripQueues() {
  const { tripId } = useParams();
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [tripExpired, setTripExpired] = useState(false);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [participantId, setParticipantId] = useState(() => location.state?.participantId || sessionStorage.getItem(`trip:${tripId}:participantId`) || '');
  const [error, setError] = useState('');

  const fetchQueues = () => fetch(`/api/trips/${tripId}/queues`).then((r) => r.json()).then(setQueues).catch(() => setQueues([]));

  useEffect(() => {
    let cancelled = false;
    const searchParams = new URLSearchParams(location.search);
    const justPaid = searchParams.get('paid') === '1';

    const load = async (isRetry = false) => {
      const tripRes = await fetch(`/api/trips/${tripId}`);
      const tripData = await tripRes.json();
      if (cancelled) return;
      if (tripRes.status === 410) {
        setTripExpired(true);
        setTrip(null);
        setConfirmingPayment(false);
      } else if (tripRes.status === 402 && justPaid && !isRetry) {
        setConfirmingPayment(true);
        setLoading(false);
        return;
      } else if (tripData.id) {
        setTrip(tripData);
        setConfirmingPayment(false);
        const qRes = await fetch(`/api/trips/${tripId}/queues`);
        const qData = await qRes.json();
        if (!cancelled) setQueues(qData);
      } else if (!justPaid) {
        setTrip(null);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [tripId]);

  // After payment redirect: poll until webhook marks trip paid (402 → 200) or give up
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('paid') !== '1' || !confirmingPayment) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;
    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;
        attempts++;
        const tripRes = await fetch(`/api/trips/${tripId}`);
        const tripData = await tripRes.json();
        if (cancelled) return;
        if (tripRes.ok && tripData.id) {
          setTrip(tripData);
          setConfirmingPayment(false);
          setLoading(false);
          const qRes = await fetch(`/api/trips/${tripId}/queues`);
          const qData = await qRes.json();
          if (!cancelled) setQueues(qData);
          return;
        }
      }
      if (!cancelled) {
        setConfirmingPayment(false);
        setError('Payment is taking longer than usual. Refresh the page in a moment.');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [tripId, confirmingPayment, location.search]);

  useEffect(() => {
    if (!trip?.id || tripExpired) return;
    const interval = setInterval(() => fetchQueues(), 8000);
    return () => clearInterval(interval);
  }, [tripId, trip?.id, tripExpired]);

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

  if (loading && !trip && !tripExpired && !confirmingPayment) return <PageLayout><div className="flex items-center justify-center min-h-[40vh] text-[#7d6b8a]">Loading…</div></PageLayout>;
  if (confirmingPayment) return <PageLayout><div className="flex flex-col items-center justify-center min-h-[40vh] text-[#7d6b8a]"><p className="mb-2">Confirming your payment…</p><p className="text-sm">You’ll be redirected in a moment.</p></div></PageLayout>;
  if (tripExpired) return (
    <PageLayout>
      <div className="max-w-md mx-auto text-center">
        <p className="text-[#5a4a6a] font-medium mb-2">This trip has ended.</p>
        <p className="text-[#7d6b8a] text-sm mb-4">Trips are valid for 7 days. Create a new trip to get a fresh queue.</p>
        <Link to="/create" className="text-[#f4a6b8] hover:underline font-medium">Create a new trip</Link>
      </div>
    </PageLayout>
  );
  if (!trip?.id) return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-[#7d6b8a] text-center max-w-md mx-auto">
        {error ? <p className="mb-4 text-[#5a4a6a]">{error}</p> : <p className="mb-4">Trip not found.</p>}
        <Link to="/" className="text-[#f4a6b8] hover:underline font-medium">Back home</Link>
      </div>
    </PageLayout>
  );

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
