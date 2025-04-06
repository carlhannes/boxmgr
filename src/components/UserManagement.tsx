import React, { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/authMiddleware';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  created_at?: string;
}

interface UserManagementProps {
  currentUser: AuthUser;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Error loading users. Please try again.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // UseEffect must be called before any conditional returns
  useEffect(() => {
    // Only fetch if the user is an admin
    if (currentUser && currentUser.isAdmin) {
      fetchUsers();
    }
  }, [currentUser]);

  // Safety check - don't render anything if not an admin
  if (!currentUser || !currentUser.isAdmin) {
    return null;
  }

  // Add a new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.toLowerCase(),
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      setSuccess(`User ${newUsername} created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewIsAdmin(false);
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  // Update a user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode === null) return;
    
    setError(null);
    setSuccess(null);
    
    const updateData: { username?: string; password?: string; isAdmin?: boolean } = {};
    
    if (editUsername) {
      updateData.username = editUsername.toLowerCase();
    }
    
    if (editPassword) {
      updateData.password = editPassword;
    }
    
    updateData.isAdmin = editIsAdmin;
    
    try {
      const response = await fetch(`/api/users/${editMode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      
      setSuccess(`User updated successfully!`);
      setEditMode(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  // Delete a user
  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      setSuccess('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Start editing a user
  const startEdit = (user: User) => {
    setEditMode(user.id);
    setEditUsername('');  // Empty means no change
    setEditPassword('');  // Empty means no change
    setEditIsAdmin(user.isAdmin);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditMode(null);
  };

  if (loading && users.length === 0) {
    return <div className="text-gray-500 my-4">Loading users...</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">User Management</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          {success}
        </div>
      )}

      {/* User list */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 text-left">Username</th>
              <th className="py-2 px-4 text-left">Admin</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                {editMode === user.id ? (
                  <td className="py-2 px-4" colSpan={3}>
                    <form onSubmit={handleUpdateUser} className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username (leave blank to keep current)
                        </label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder={user.username}
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password (leave blank to keep current)
                        </label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`edit-admin-${user.id}`}
                          checked={editIsAdmin}
                          onChange={(e) => setEditIsAdmin(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor={`edit-admin-${user.id}`} className="ml-2 text-sm text-gray-700">
                          Admin
                        </label>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-2 px-4">
                      {user.username}
                      {user.id === currentUser.id && <span className="ml-2 text-sm text-gray-500">(you)</span>}
                    </td>
                    <td className="py-2 px-4">
                      {user.isAdmin ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Admin</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">User</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new user form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          Add New User
        </button>
      ) : (
        <div className="mt-4 bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-3">Add New User</h3>
          
          <form onSubmit={handleAddUser}>
            <div className="mb-3">
              <label htmlFor="new-username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="new-username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-3 flex items-center">
              <input
                type="checkbox"
                id="new-admin"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="new-admin" className="ml-2 text-sm text-gray-700">
                Admin User
              </label>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add User
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;