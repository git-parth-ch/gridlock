// admin/src/App.jsx
import { useState } from 'react';
import AdminLogin     from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [authed, setAuthed] = useState(
    () => !!sessionStorage.getItem('admin_pw')
  );

  if (!authed) return <AdminLogin onAuth={() => setAuthed(true)} />;
  return <AdminDashboard />;
}