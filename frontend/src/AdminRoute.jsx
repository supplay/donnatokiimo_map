import { Navigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { useState, useEffect } from 'react';

const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const groups = user.signInUserSession.accessToken.payload['cognito:groups'];
        setIsAdmin(groups && groups.includes('Admins'));
      } catch (e) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  if (isAdmin === null) return <div>読み込み中...</div>;
  return isAdmin ? children : <Navigate to="/" />;
};

export default AdminRoute;
