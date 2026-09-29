import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Investigate from './pages/Investigate';
import History from './pages/History';
import Memory from './pages/Memory';
import Architecture from './pages/Architecture';
import LearningCurve from './pages/LearningCurve';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="investigate" element={<Investigate />} />
          <Route path="history" element={<History />} />
          <Route path="memory" element={<Memory />} />
          <Route path="learning" element={<LearningCurve />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
