import { useEffect, useState } from 'react';

export default function Health() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <main className="status-page">
      <section className="status-panel">
        <p className="eyebrow">API Health</p>

        {loading && <p>Loading...</p>}

        {error && (
          <div>
            <h1>API Error</h1>
            <p>{error}</p>
          </div>
        )}

        {health && (
          <div>
            <h1>{health.ok ? '✓ Healthy' : '✗ Unhealthy'}</h1>
            <p><strong>Service:</strong> {health.service}</p>
            <p><strong>MongoDB:</strong> {health.mongo}</p>
          </div>
        )}
      </section>
    </main>
  );
}
