export type SessionUser = {
  id: string;
  role: 'admin' | 'ops' | 'support';
};

export async function getSessionUser(): Promise<SessionUser | null> {
  return {
    id: 'admin-1',
    role: 'admin',
  };
}
