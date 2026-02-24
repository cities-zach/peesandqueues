export default function QueueList({ queue, participantId, onJoin, onLeave, onDone }) {
  const myEntry = queue.entries.find((e) => e.participantId === participantId);
  return (
    <div className="bg-white/80 rounded-xl p-4 border border-[#e5dfed]">
      <h2 className="font-semibold text-[#5a4a6a] mb-3">{queue.bathroomName}</h2>
      <ul className="space-y-2 mb-3">
        {queue.entries.length === 0 && <li className="text-[#7d6b8a] text-sm">No one in queue</li>}
        {queue.entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between text-sm">
            <span className={e.state === 'active' ? 'text-[#c5e8b7] font-medium' : 'text-[#5a4a6a]'}>
              {e.state === 'active' ? '▶ ' : ''}{e.displayName} {e.state === 'active' ? '(in use)' : `#${e.position}`}
            </span>
            {e.participantId === participantId && e.state === 'waiting' && (
              <button type="button" onClick={() => onLeave(queue.bathroomId)} className="text-[#f4a6b8] hover:underline text-xs font-medium">Leave</button>
            )}
            {e.participantId === participantId && e.state === 'active' && (
              <button type="button" onClick={() => onDone(queue.bathroomId)} className="text-[#c5e8b7] hover:underline text-xs font-medium">I'm done</button>
            )}
          </li>
        ))}
      </ul>
      {!myEntry && (
        <button type="button" onClick={() => onJoin(queue.bathroomId)} className="text-[#f4a6b8] hover:text-[#c4b5d4] font-medium text-sm">
          Join queue
        </button>
      )}
    </div>
  );
}
