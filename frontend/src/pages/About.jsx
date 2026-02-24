import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function About() {
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#5a4a6a] mb-6">About Pees & Queues</h1>
        <div className="space-y-4 text-[#5a4a6a]">
          <p>
            Pees & Queues was born on a group trip—waiting, hung over, to use the bathroom. We’ve all been there: one bathroom, too many people, and that awkward “who’s next?” dance.
          </p>
          <p>
            We’re committed to reducing that friction. No more guessing, no more line anxiety. Just a simple way to join the queue, get notified when it’s your turn, and get on with having a good time. We want group trips to be more fun and comfortable for everyone.
          </p>
          <p>
            This project was created by a solo developer who got tired of the morning bathroom bottleneck and decided to fix it. One trip, one idea, and a lot of coffee.
          </p>
        </div>
        <Link to="/" className="inline-block mt-8 rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-2 px-4 hover:bg-[#fad4dc] transition">
          Back home
        </Link>
      </div>
    </PageLayout>
  );
}
