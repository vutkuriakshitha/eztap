import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Onboarding from './components/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PostTask from './pages/PostTask';
import BrowseTasks from './pages/BrowseTasks';
import TaskDetail from './pages/TaskDetail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import HelperProfile from './pages/HelperProfile';
import Admin from './pages/Admin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Onboarding />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/browse-tasks" element={<BrowseTasks />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/helpers/:uid" element={<HelperProfile />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/post-task"
              element={
                <ProtectedRoute>
                  <PostTask />
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
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
