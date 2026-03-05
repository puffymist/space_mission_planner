import './App.css';
import CanvasRenderer from './canvas/CanvasRenderer.jsx';
import TopBar from './components/TopBar.jsx';
import EpochSlider from './components/EpochSlider.jsx';
import SpacecraftPanel from './components/SpacecraftPanel.jsx';
import DeltaVPanel from './components/DeltaVPanel.jsx';

function App() {
  return (
    <div className="app">
      <CanvasRenderer />
      <TopBar />
      <EpochSlider />
      <SpacecraftPanel />
      <DeltaVPanel />
    </div>
  );
}

export default App;
