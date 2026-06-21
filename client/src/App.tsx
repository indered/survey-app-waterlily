import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HealthCheck from './components/HealthCheck';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/" element={
          <main className="status-page">
            <section className="status-panel">
              <p className="eyebrow">MERN bootstrap</p>
              <h1>survey-app-waterlily is running.</h1>
              <p>The API is available at <code>/api/health</code>.</p>
            </section>
          </main>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
