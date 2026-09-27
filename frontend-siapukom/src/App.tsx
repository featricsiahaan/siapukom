import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Masuk } from './pages/Masuk';
import { Latihan } from './pages/Latihan';
import { Simulasi } from './pages/Simulasi';
import { Dashboard } from './pages/Dashboard';
import { Upgrade } from './pages/Upgrade';
import { Materi } from './pages/Materi';
import { Legal } from './pages/Legal';
import { AdminPayments } from './pages/AdminPayments';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Masuk />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/latihan" element={<Latihan />} />
          <Route
            path="/simulasi"
            element={
              <ProtectedRoute>
                <Simulasi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade"
            element={
              <ProtectedRoute>
                <Upgrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/materi"
            element={
              <ProtectedRoute>
                <Materi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute>
                <AdminPayments />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
