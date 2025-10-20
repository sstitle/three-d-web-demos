import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DemoViewer from './pages/DemoViewer';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo/:demoId" element={<DemoViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
