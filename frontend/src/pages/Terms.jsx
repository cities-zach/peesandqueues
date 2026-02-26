import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function Terms() {
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#5a4a6a] mb-2">Terms of Service</h1>
        <p className="text-[#7d6b8a] text-sm mb-6">Last updated: February 2025</p>
        <div className="space-y-6 text-[#5a4a6a] text-sm">
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">1. Acceptance</h2>
            <p>By using Pees and Queues (“the Service”), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">2. Description of Service</h2>
            <p>Pees and Queues provides bathroom queue coordination for group trips. Hosts create a trip, share an invite link, and participants join to get in line and receive SMS notifications when it’s their turn. Trips are paid ($1 per trip, valid for 7 days) via Stripe. We do not guarantee uninterrupted availability of the Service.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">3. Eligibility</h2>
            <p>You must be able to form a binding contract to use the Service. If you are under 18, you may use the Service only with the consent of a parent or guardian.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">4. Your Data and Responsibilities</h2>
            <p>You provide trip names, bathroom names, your name, and phone number (and, for hosts, invite others who provide their name and phone). You are responsible for the accuracy of this information and for ensuring that anyone you invite has consented to receive SMS messages. We do not sell your personal data. See our <Link to="/privacy" className="text-[#f4a6b8] hover:underline">Privacy Policy</Link> for details.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">5. SMS and Message Program</h2>
            <p><strong>Message rates.</strong> We do not charge you for SMS messages. Your mobile carrier may charge you standard message and data rates (and fees for international messages, if applicable) according to your plan.</p>
            <p className="mt-2"><strong>Message frequency.</strong> Messages are sent only in connection with your use of the Service: when it’s your turn in a bathroom queue, when we send a reminder (e.g., if you’ve been in the bathroom for a while), and in reply to messages you send (e.g., JOIN, DONE, STATUS, HELP). Frequency varies and depends on how often you join queues and how many people are on the trip.</p>
            <p className="mt-2"><strong>Opt-out.</strong> To stop receiving messages, leave any queue you’re in (reply DONE when finished, or ask your host to remove you) and do not join new trips with this phone number. You can also text STOP to the trip number at any time to opt out of messages for that trip. After you opt out, you may receive a final confirmation message. For help, text HELP to the trip number or contact us at <a href="https://zachsimonson.com" target="_blank" rel="noopener noreferrer" className="text-[#f4a6b8] hover:underline">zachsimonson.com</a>.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">6. Payment and Refunds</h2>
            <p>Payment for trips is processed by Stripe. Stripe’s terms apply to payment processing. We do not store your card details. Refunds are not provided after a trip has been created and used; we may make exceptions at our discretion for technical failures.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">7. Acceptable Use</h2>
            <p>You may not use the Service for any illegal purpose, to harass others, or to abuse the SMS or queue system. We may suspend or terminate your access if we believe you have violated these terms.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">8. Disclaimers</h2>
            <p>The Service is provided “as is.” We disclaim all warranties, express or implied. We are not liable for coordination failures, delays, or any consequences of using the Service.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by Iowa law, our total liability to you for any claims arising from the Service shall not exceed the amount you paid us in the past 12 months (e.g., the fee for the trip in question). We are not liable for indirect, incidental, or consequential damages.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">10. Governing Law and Venue</h2>
            <p>These terms are governed by the laws of the State of Iowa. Any dispute shall be brought in the state or federal courts located in Iowa.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">11. Changes</h2>
            <p>We may update these terms from time to time. The “Last updated” date at the top will change when we do. Continued use of the Service after changes means you accept the updated terms.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#5a4a6a] mb-2">12. Contact</h2>
            <p>For questions about these terms, contact us at <a href="https://zachsimonson.com" target="_blank" rel="noopener noreferrer" className="text-[#f4a6b8] hover:underline">zachsimonson.com</a>.</p>
          </section>
        </div>
        <Link to="/" className="inline-block mt-8 rounded-2xl bg-[#f4a6b8] text-[#5a4a6a] font-medium py-2 px-4 hover:bg-[#fad4dc] transition">
          Back home
        </Link>
      </div>
    </PageLayout>
  );
}
