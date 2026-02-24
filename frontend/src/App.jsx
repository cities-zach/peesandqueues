import { Routes, Route } from 'react-router-dom';
import CreateTrip from './pages/CreateTrip';
import JoinTrip from './pages/JoinTrip';
import TripQueues from './pages/TripQueues';
import Home from './pages/Home';
import About from './pages/About';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateTrip />} />
      <Route path="/join/:token" element={<JoinTrip />} />
      <Route path="/trip/:tripId" element={<TripQueues />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
