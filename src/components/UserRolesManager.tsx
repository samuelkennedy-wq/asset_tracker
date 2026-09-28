import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Key, 
  UserPlus, 
  Lock, 
  Trash2, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  Search,
  UserCheck,
  Building,
  Mail,
  Award
} from 'lucide-react';
import { UserRole, AppUser, RolePermissions } from '../types';

interface UserRolesManagerProps {
  currentUserRole: string;
  onRefresh: () => void;
  onSwitchRole?: (roleId: string, userDetails?: { name: string; empId: string }) => void;
}

const DEFAULT_PERMISSIONS: RolePermissions = {
  can_create_movement_tickets: true,
  can_edit_tickets: false,
  can_approve_tickets: false,
  can_reject_tickets: false,
  can_gate_scan: false,
  can_view_floor_map: true,
  can_view_asset_directory: true,
  can_export_reports: false,
  can_access_server_terminal: false,
  can_manage_roles: false
};

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blue (Engineers)', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'amber', label: 'Amber (Managers)', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'indigo', label: 'Indigo (Security)', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { id: 'emerald', label: 'Emerald (Admins)', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'purple', label: 'Purple (Auditors)', bg: 'bg-purple-100 text-purple-900 border-purple-300' },
  { id: 'rose', label: 'Rose (Specialists)', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
  { id: 'teal', label: 'Teal (Facilities)', bg: 'bg-teal-100 text-teal-900 border-teal-300' },
];

export default function UserRolesManager({ currentUserRole, onRefresh, onSwitchRole }: UserRolesManagerProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Role Creation / Editing Modal State
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    department: 'IT Operations',
    badge_color: 'blue',
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  // User Creation Modal State
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    emp_id: '',
    role_id: 'module_a_engineer',
    department: 'IT Operations'
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRolesAndUsers = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/users')
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Error fetching roles and users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndUsers();
  }, []);

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      code: '',
      description: '',
      department: 'IT Operations',
      badge_color: 'blue',
      permissions: { ...DEFAULT_PERMISSIONS }
    });
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: UserRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      department: role.department || 'IT Operations',
      badge_color: role.badge_color || 'blue',
      permissions: { ...DEFAULT_PERMISSIONS, ...role.permissions }
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name || !roleForm.code) {
      setFeedback({ type: 'error', message: 'Role name and role code are required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const endpoint = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          message: editingRole 
            ? `Role '${roleForm.name}' updated successfully.` 
            : `New role '${roleForm.name}' created successfully!` 
        });
        setShowRoleModal(false);
        fetchRolesAndUsers();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save role.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error saving role.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: UserRole) => {
    if (role.is_system_default) {
      alert('Default system roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Role '${role.name}' deleted.` });
        fetchRolesAndUsers();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Could not delete role.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error deleting role.' });
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      emp_id: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
      role_id: roles.length > 0 ? roles[0].id : 'module_a_engineer',
      department: 'IT Operations'
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      emp_id: user.emp_id,
      role_id: user.role_id,
      department: user.department || 'IT Operations'
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.emp_id) {
      setFeedback({ type: 'error', message: 'User name, email, and employee ID are required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          message: editingUser 
            ? `User profile for '${userForm.name}' updated.` 
            : `User '${userForm.name}' created successfully!` 
        });
        setShowUserModal(false);
        fetchRolesAndUsers();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save user.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error saving user.' });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permKey: keyof RolePermissions) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey]
      }
    }));
  };

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'purple':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'rose':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'teal':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.emp_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5" id="user-roles-manager-container">
      
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">User Roles & Access Control Center</h2>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                ADMIN GOVERNANCE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create custom organization user roles, configure granular permission policies, and assign employee accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchRolesAndUsers}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Refresh Roles & Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateRole}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>

          <button
            onClick={handleOpenCreateUser}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>Add User Account</span>
          </button>
        </div>
      </div>

      {/* Global Alert Feedback Notification */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
        </div>
      )}

      {/* View Switcher Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>System User Roles ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory Accounts ({users.length})</span>
          </button>
        </div>

        {/* Search Filter Box */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'roles' ? 'Search roles by name or code...' : 'Search user email or name...'}
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-900 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ROLES TAB VIEW */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const assignedUsersCount = users.filter(u => u.role_id === role.id).length;

            return (
              <div 
                key={role.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-blue-400 transition-all"
              >
                <div className="space-y-3">
                  {/* Role Title Bar */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-black border rounded-md uppercase ${getBadgeStyle(role.badge_color)}`}>
                          {role.code}
                        </span>
                        {role.is_system_default && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {role.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {role.department || 'IT Operations'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditRole(role)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Role & Permissions"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.is_system_default && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {role.description || 'No description provided.'}
                  </p>

                  {/* Permissions Summary Matrix */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Granted Access Permissions:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium">
                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_create_movement_tickets ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_create_movement_tickets ? 'text-slate-800' : 'text-slate-400'}>
                          Create Tickets
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_approve_tickets ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_approve_tickets ? 'text-slate-800' : 'text-slate-400'}>
                          Approve Passes
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_gate_scan ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_gate_scan ? 'text-slate-800' : 'text-slate-400'}>
                          Gate Scan
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_export_reports ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_export_reports ? 'text-slate-800' : 'text-slate-400'}>
                          Audit & Export
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_access_server_terminal ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_access_server_terminal ? 'text-slate-800' : 'text-slate-400'}>
                          Server Console
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.permissions?.can_manage_roles ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={role.permissions?.can_manage_roles ? 'text-slate-800' : 'text-slate-400'}>
                          Manage Roles
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Bar & Quick Switcher Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-500 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{assignedUsersCount} Active User(s)</span>
                  </span>

                  {onSwitchRole && (
                    <button
                      onClick={() => onSwitchRole(role.id, { name: `${role.name} Operator`, empId: `ROLE-${role.code}` })}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
                      title="Switch active session into this role to test permissions"
                    >
                      <span>Switch to Role</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* USER DIRECTORY TAB VIEW */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Office Email (@247.ai)</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Assigned User Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const assignedRole = roles.find(r => r.id === user.role_id);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-mono font-bold text-slate-700 text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span>{user.name}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {user.email}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {user.emp_id}
                      </td>

                      <td className="py-3.5 px-4">
                        {assignedRole ? (
                          <span className={`px-2.5 py-1 text-xs font-mono font-bold border rounded-md ${getBadgeStyle(assignedRole.badge_color)}`}>
                            {assignedRole.name} ({assignedRole.code})
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">Unassigned ({user.role_id})</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {user.department || 'IT Operations'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>ACTIVE</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg border border-slate-200 text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {onSwitchRole && (
                            <button
                              onClick={() => onSwitchRole(user.role_id, { name: user.name, empId: user.emp_id })}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Login as this user"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                              <span>Login As</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRole ? `Edit User Role (${editingRole.code})` : 'Create New System User Role'}
                </h3>
              </div>
              <button 
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Role Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. IT Inventory Lead"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Role Code (3-6 chars) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. INV_LEAD"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <input
                    type="text"
                    value={roleForm.department}
                    onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                    placeholder="e.g. IT Operations"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Badge Theme Color
                  </label>
                  <select
                    value={roleForm.badge_color}
                    onChange={(e) => setRoleForm({ ...roleForm, badge_color: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none cursor-pointer"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Role Description & Scope
                </label>
                <textarea
                  rows={2}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe duties, clearance tier, and responsibilities..."
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Granular Permission Toggles Matrix */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Configure Access Permission Policy Matrix
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_create_movement_tickets}
                      onChange={() => togglePermission('can_create_movement_tickets')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Create CPU Movement Requests</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_edit_tickets}
                      onChange={() => togglePermission('can_edit_tickets')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Edit Ticket Parameters</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_approve_tickets}
                      onChange={() => togglePermission('can_approve_tickets')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Approve Passes & Gate Clearance</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_reject_tickets}
                      onChange={() => togglePermission('can_reject_tickets')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Reject Movement Requests</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_gate_scan}
                      onChange={() => togglePermission('can_gate_scan')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Gate Security Camera Scan</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_view_floor_map}
                      onChange={() => togglePermission('can_view_floor_map')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Interactive 7th Floor Map</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_view_asset_directory}
                      onChange={() => togglePermission('can_view_asset_directory')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">View Asset Stock Directory</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_export_reports}
                      onChange={() => togglePermission('can_export_reports')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Export Master Audit CSV/Excel</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_access_server_terminal}
                      onChange={() => togglePermission('can_access_server_terminal')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">Server Logs Terminal</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.can_manage_roles}
                      onChange={() => togglePermission('can_manage_roles')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">User Role Administration</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Role Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingUser ? 'Edit User Account' : 'Register New User Account'}
                </h3>
              </div>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Official Email (@247.ai) *
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@247.ai"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.emp_id}
                  onChange={(e) => setUserForm({ ...userForm, emp_id: e.target.value })}
                  placeholder="01099318"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assigned System User Role *
                </label>
                <select
                  value={userForm.role_id}
                  onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Department
                </label>
                <input
                  type="text"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  placeholder="e.g. IT Support"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
