import { useState, useRef, useEffect } from 'react';
import type { AuthState } from '../../hooks/useAuth';

interface AuthButtonProps {
  auth: AuthState;
  onOpenMyMaps: () => void;
}

export default function AuthButton({ auth, onOpenMyMaps }: AuthButtonProps) {
  const { user, loading, signInWithGoogle, signOut } = auth;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <button className="btn-action btn-signin" onClick={signInWithGoogle} title="Sign in with Google">
        <svg viewBox="0 0 18 18" width="13" height="13" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.082 17.64 11.773 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        SIGN IN
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name ?? user.email ?? 'Account') as string;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="auth-menu-wrapper" ref={menuRef}>
      <button
        className="btn-avatar"
        onClick={() => setMenuOpen(v => !v)}
        title={name}
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="avatar-img" referrerPolicy="no-referrer" />
          : <span className="avatar-initials">{initials}</span>}
      </button>

      {menuOpen && (
        <div className="auth-dropdown" role="menu">
          <div className="auth-dropdown-user">
            <span className="auth-dropdown-name">{name}</span>
            <span className="auth-dropdown-email">{user.email}</span>
          </div>
          <button
            className="auth-dropdown-item"
            role="menuitem"
            onClick={() => { setMenuOpen(false); onOpenMyMaps(); }}
          >
            📋 My Maps
          </button>
          <button
            className="auth-dropdown-item auth-dropdown-signout"
            role="menuitem"
            onClick={() => { setMenuOpen(false); signOut(); }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
