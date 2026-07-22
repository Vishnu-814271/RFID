import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { People } from './pages/People';
import { Cards } from './pages/Cards';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { StaffUsers } from './pages/StaffUsers';
import { LiveAttendance } from './pages/LiveAttendance';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!allowedRoles.includes(user?.role)) {
    return <div className="page-container"><h2>Unauthorized Access</h2></div>;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="live" element={<LiveAttendance />} />
            <Route path="people" element={<People />} />
            <Route path="cards" element={<Cards />} />
            <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><Reports /></ProtectedRoute>} />
            <Route path="audit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><Settings /></ProtectedRoute>} />
            <Route path="staff-users" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><StaffUsers /></ProtectedRoute>} />
            <Route path="*" element={<div>Page Not Found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
