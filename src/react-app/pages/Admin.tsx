import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useNavigate } from 'react-router';
import Notification from '@/react-app/components/Notification';
import AdminImageManagement from '@/react-app/components/AdminImageManagement';
import { Users, Image as ImageIcon } from 'lucide-react';

interface AuthorizedUser {
  email: string;
  name: string;
  is_admin: boolean;
  added_by: string;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'images'>('users');
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', isAdmin: false });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!user.isAdmin) {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        showNotification('error', 'Error', 'Failed to fetch users');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.email || !newUser.name) {
      showNotification('error', 'Validation Error', 'Email and name are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Success', 'User added successfully');
        setNewUser({ email: '', name: '', isAdmin: false });
        setShowAddForm(false);
        fetchUsers();
      } else {
        showNotification('error', 'Error', data.error || 'Failed to add user');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to add user');
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Success', 'User removed successfully');
        fetchUsers();
      } else {
        showNotification('error', 'Error', data.error || 'Failed to remove user');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to remove user');
    }
  };

  const handleToggleAdmin = async (email: string, currentName: string, isCurrentlyAdmin: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentName, isAdmin: !isCurrentlyAdmin })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Success', 'User updated successfully');
        fetchUsers();
      } else {
        showNotification('error', 'Error', data.error || 'Failed to update user');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to update user');
    }
  };

  if (!user || !user.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        show={notification.show}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-300">Manage users and system resources</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 w-fit">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === 'images'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Image Management</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' ? (
            <div className="bg-white/10 backdrop-blur-sm shadow rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-600">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white">User Management</h2>
                    <p className="text-sm text-gray-300">Manage authorized users and admin privileges</p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add User
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-600">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200">Email</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">Name</label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newUser.isAdmin}
                          onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-200">Admin privileges</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Add User
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewUser({ email: '', name: '', isAdmin: false });
                      }}
                      className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Added By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Added Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-600">
                  {users.map((authorizedUser) => (
                    <tr key={authorizedUser.email}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">{authorizedUser.name}</div>
                            <div className="text-sm text-gray-300">{authorizedUser.email}</div>
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${authorizedUser.is_admin
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {authorizedUser.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {authorizedUser.added_by}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(authorizedUser.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleToggleAdmin(authorizedUser.email, authorizedUser.name, authorizedUser.is_admin)}
                            className={`${authorizedUser.is_admin
                              ? 'text-orange-400 hover:text-orange-300'
                              : 'text-blue-400 hover:text-blue-300'
                              }`}
                            disabled={authorizedUser.email === user.email}
                          >
                            {authorizedUser.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(authorizedUser.email)}
                            className="text-red-400 hover:text-red-300"
                            disabled={authorizedUser.email === user.email}
                          >
                            Remove
                          </button>
                        </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400">
                  No authorized users found.
                </div>
              )}
            </div>
          ) : (
            <AdminImageManagement />
          )}
        </div>
      </div>
    </>
  );
}