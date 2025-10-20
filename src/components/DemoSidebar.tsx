import { Link, useParams } from 'react-router-dom';
import { demoRegistry } from '../demos/registry';
import './DemoSidebar.css';

interface DemoSidebarProps {
  isOpen: boolean;
}

export default function DemoSidebar({ isOpen }: DemoSidebarProps) {
  const { demoId } = useParams<{ demoId: string }>();

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>Demos</h3>
      </div>

      <nav className="sidebar-nav">
        {demoRegistry.map((demo) => (
          <Link
            key={demo.id}
            to={`/demo/${demo.id}`}
            className={`sidebar-item ${demo.id === demoId ? 'active' : ''}`}
          >
            <div className="sidebar-item-title">{demo.title}</div>
            <div className="sidebar-item-description">{demo.description}</div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
