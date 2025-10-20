import { Link } from 'react-router-dom';
import { demoRegistry } from '../demos/registry';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>ThreeJS Demos</h1>
        <p>A collection of interactive ThreeJS demonstrations</p>
      </header>

      <div className="demo-grid">
        {demoRegistry.map((demo) => (
          <Link
            key={demo.id}
            to={`/demo/${demo.id}`}
            className="demo-card"
          >
            <h2>{demo.title}</h2>
            <p>{demo.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
