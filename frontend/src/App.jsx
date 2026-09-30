import React from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Documents from './components/Documents';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Documents />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
