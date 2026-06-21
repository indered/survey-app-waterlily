import { useEffect, useState } from 'react';

type HealthResponse = {
  ok: boolean;
  service: string;
  mongo: string;
};

export default function Health() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
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
