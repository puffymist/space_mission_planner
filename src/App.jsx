import './App.css';
import CanvasRenderer from './canvas/CanvasRenderer.jsx';
import TopBar from './components/TopBar.jsx';
import EpochSlider from './components/EpochSlider.jsx';
import SpacecraftPanel from './components/SpacecraftPanel.jsx';
import DeltaVPanel from './components/DeltaVPanel.jsx';
import TrajectoryInfo from './components/TrajectoryInfo.jsx';
import CameraHelper from './components/CameraHelper.jsx';
import HohmannPanel from './components/HohmannPanel.jsx';
import ImportExport from './components/ImportExport.jsx';

function App() {
  return (
    <div className="app">
      <CanvasRenderer />
      <TopBar />
      <ImportExport />
      <CameraHelper />
      <EpochSlider />
      <div style={{
        position: 'absolute', top: 44, right: 8,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 'calc(100vh - 100px)',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <SpacecraftPanel />
        <DeltaVPanel />
      </div>
      <HohmannPanel />
      <TrajectoryInfo />
    </div>
  );
}

export default App;
