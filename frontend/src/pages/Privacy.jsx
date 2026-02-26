import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function Privacy() {
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#5a4a6a] mb-2">Privacy Policy</h1>
        <p className="text-[#7d6b8a] text-sm mb-6">Last updated: February 2025</p>
        <div className="space-y-6 text-[#5a4a6a] text-sm">
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Who We Are</h2>
            <p>Pees and Queues is a bathroom queue coordination service based in Iowa. For questions about this policy, contact us at <a href="https://zachsimonson.com" target="_blank" rel="noopener noreferrer" className="text-[#f4a6b8] hover:underline">zachsimonson.com</a>.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Trip creators:</strong> Trip name, bathroom names. Payment is processed by Stripe; we do not store your card number or full payment details.</li>
              <li><strong>Participants:</strong> Name and phone number (when you join a trip), and the SMS messages you send and receive (e.g., JOIN, DONE, STATUS) so we can run the queue and send turn notifications.</li>
              <li><strong>Technical:</strong> Our hosting providers (e.g., Render, Vercel) and database (Supabase) may log requests, IP addresses, and similar data in the course of providing the service.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">How We Use It</h2>
            <p>We use this data to operate the Service: to manage trips and queues, send SMS turn notifications and reminders, process payments, prevent abuse, and comply with the law. <strong>We do not sell your personal data.</strong></p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Third Parties</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Supabase</strong> hosts our database (trip, participant, and queue data). Their privacy practices apply to that processing.</li>
              <li><strong>Twilio</strong> delivers and receives SMS messages. Their privacy policy applies to their handling of message content and phone numbers.</li>
              <li><strong>Stripe</strong> processes payments. Card data stays with Stripe; their privacy policy applies to payment processing.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Retention</h2>
            <p>Trip and participant data are kept for as long as needed to run the Service (e.g., for the duration of a trip and a short period after). Logs may be retained for a limited time for operational and legal purposes. We may retain data longer when required by law.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Security</h2>
            <p>We use reasonable measures to protect your data. No system is completely secure; we cannot guarantee absolute security.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data, subject to legal retention requirements. Contact us at the link above to make a request.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Children</h2>
            <p>The Service is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Changes</h2>
            <p>We may update this Privacy Policy. The “Last updated” date at the top will change when we do. For material changes, we will bring them to your attention (e.g., by notice on the site or by email where appropriate).</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">Contact</h2>
            <p>For privacy questions or to exercise your rights, contact us at <a href="https://zachsimonson.com" target="_blank" rel="noopener noreferrer" className="text-[#f4a6b8] hover:underline">zachsimonson.com</a>.</p>
          </section>
        </div>
        <Link to="/" className="inline-block mt-8 rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-2 px-4 hover:bg-[#fad4dc] transition">
          Back home
        </Link>
      </div>
    </PageLayout>
  );
}
