import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainApp from './MainApp';
import AdminApp from './Admin';

function App() {
  // Check if we're on /admin route
  // BrowserRouter will handle this automatically
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
