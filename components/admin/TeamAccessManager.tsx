'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AdminRole } from '@/lib/stores/admin-store';

interface MemberRecord {
  email: string;
  role: AdminRole;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamAccessManagerProps {
  currentUserEmail: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function TeamAccessManager({ currentUserEmail }: TeamAccessManagerProps) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<AdminRole>('editor');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.email.localeCompare(b.email));
  }, [members]);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/auth?action=members', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setMembers(Array.isArray(result.members) ? result.members : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('');
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          email: formEmail,
          role: formRole,
          locale: 'en',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setStatus(`Invite sent to ${formEmail}`);
      setFormEmail('');
      setFormRole('editor');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    }
  };

  const updateMember = async (email: string, role: AdminRole, isActive: boolean) => {
    setStatus('');
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_role',
          email,
          role,
          isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setStatus(`Updated role for ${email}`);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Team Access</h3>
        <button
          type="button"
          onClick={() => void loadMembers()}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
        >
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Roles: <strong>Admin</strong> (full access), <strong>Editor</strong> (create/publish/delete), <strong>Viewer</strong> (read-only).
      </p>

      <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <input
          type="email"
          value={formEmail}
          onChange={(event) => setFormEmail(event.target.value)}
          placeholder="user@company.com"
          required
          className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />

        <select
          value={formRole}
          onChange={(event) => setFormRole(event.target.value as AdminRole)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>

        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Invite
        </button>
      </form>

      {status && (
        <div className="mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
          {status}
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400">Loading members...</td>
              </tr>
            ) : sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400">No members found.</td>
              </tr>
            ) : (
              sortedMembers.map((member) => {
                const isSelf = member.email === currentUserEmail;

                return (
                  <tr key={member.email} className="border-b border-gray-100 dark:border-gray-700/60">
                    <td className="py-3 pr-3 text-gray-900 dark:text-white">{member.email}</td>
                    <td className="py-3 pr-3 text-gray-700 dark:text-gray-200">{ROLE_LABELS[member.role]}</td>
                    <td className="py-3 pr-3">
                      <span className={member.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {member.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        {(['admin', 'editor', 'viewer'] as AdminRole[]).map((roleOption) => (
                          <button
                            key={`${member.email}-${roleOption}`}
                            type="button"
                            disabled={member.role === roleOption || (isSelf && roleOption !== 'admin')}
                            onClick={() => void updateMember(member.email, roleOption, member.is_active)}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-40"
                          >
                            {ROLE_LABELS[roleOption]}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => void updateMember(member.email, member.role, !member.is_active)}
                          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-40"
                        >
                          {member.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
