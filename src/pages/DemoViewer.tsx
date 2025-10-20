import { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { demoRegistry } from '../demos/registry';
import DemoSidebar from '../components/DemoSidebar';
import './DemoViewer.css';

export default function DemoViewer() {
  const { demoId } = useParams<{ demoId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const demoInfo = useMemo(
    () => demoRegistry.find((demo) => demo.id === demoId),
    [demoId]
  );

  const DemoComponent = useMemo(() => {
    if (!demoInfo) return null;
    return lazy(demoInfo.component);
  }, [demoInfo]);

  // Keyboard shortcut for sidebar toggle (Alt/Cmd + D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.altKey) && e.key === 'd') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!demoInfo || !DemoComponent) {
    return (
      <div className="demo-viewer">
        <div className="demo-error">
          <h1>Demo not found</h1>
          <p>The demo "{demoId}" does not exist.</p>
          <Link to="/" className="back-link">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-viewer">
      <DemoSidebar isOpen={sidebarOpen} />

      <div className="demo-content">
        <nav className="demo-nav">
          <div className="nav-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle demo list"
            >
              ☰
            </button>
            <Link to="/" className="back-link">← Back to home</Link>
          </div>
          <h2>{demoInfo.title}</h2>
        </nav>

        <Suspense fallback={<div className="demo-loading">Loading demo...</div>} key={demoId}>
          <DemoComponent key={demoId} />
        </Suspense>
      </div>
    </div>
  );
}
