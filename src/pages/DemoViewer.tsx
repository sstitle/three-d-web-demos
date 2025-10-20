import { Suspense, lazy, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { demoRegistry } from '../demos/registry';
import './DemoViewer.css';

export default function DemoViewer() {
  const { demoId } = useParams<{ demoId: string }>();

  const demoInfo = useMemo(
    () => demoRegistry.find((demo) => demo.id === demoId),
    [demoId]
  );

  const DemoComponent = useMemo(() => {
    if (!demoInfo) return null;
    return lazy(demoInfo.component);
  }, [demoInfo]);

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
      <nav className="demo-nav">
        <Link to="/" className="back-link">← Back to home</Link>
        <h2>{demoInfo.title}</h2>
      </nav>

      <Suspense fallback={<div className="demo-loading">Loading demo...</div>}>
        <DemoComponent />
      </Suspense>
    </div>
  );
}
