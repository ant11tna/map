import { Route, Routes } from 'react-router-dom';
import ListPage from './pages/ListPage';
import MapPage from './pages/MapPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/list" element={<ListPage />} />
    </Routes>
  );
}

export default App;
