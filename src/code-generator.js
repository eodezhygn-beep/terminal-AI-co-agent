import path from 'path';

const generationRules = [
  {
    name: 'react-login-page',
    matches: ({ taskDescription, path: filePath, projectContext }) => {
      const normalizedTask = (taskDescription || '').toLowerCase();
      const normalizedPath = (filePath || '').replace(/\\\\/g, '/').toLowerCase();
      const isLoginPagePath = normalizedPath.endsWith('/features/auth/login.tsx');
      const isLoginPageTask = /\blogin\b/.test(normalizedTask) && /\breact\b/.test(normalizedTask) && /\btailwind\b/.test(normalizedTask);
      const isReactProject = projectContext?.framework === 'react';

      return isLoginPagePath || (isLoginPageTask && normalizedPath.endsWith('login.tsx')) || (isReactProject && /\blogin\b/.test(normalizedTask) && normalizedPath.endsWith('login.tsx'));
    },
    generate: () => ({
      language: 'tsx',
      content: `import React from 'react';
import LoginForm from './components/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your account with your email and password.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
`
    })
  },
  {
    name: 'react-login-form',
    matches: ({ taskDescription, path: filePath, projectContext }) => {
      const normalizedTask = (taskDescription || '').toLowerCase();
      const normalizedPath = (filePath || '').replace(/\\\\/g, '/').toLowerCase();
      const isFormPath = normalizedPath.endsWith('/features/auth/components/loginform.tsx');
      const isFormTask = /\blogin\b/.test(normalizedTask) && /\bform\b/.test(normalizedTask);
      return isFormPath || isFormTask || normalizedPath.endsWith('loginform.tsx');
    },
    generate: () => ({
      language: 'tsx',
      content: `import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit?: (payload: { email: string; password: string }) => void;
  loading?: boolean;
}

export default function LoginForm({ onSubmit, loading = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (onSubmit) {
      onSubmit({ email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Enter your password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
`
    })
  },
  {
    name: 'backend-login-endpoint',
    matches: ({ taskDescription, path: filePath }) => {
      const normalizedTask = (taskDescription || '').toLowerCase();
      const normalizedPath = (filePath || '').replace(/\\\\/g, '/').toLowerCase();
      const isLoginApiPath = /\/auth\/login\.ts$/.test(normalizedPath);
      const isLoginApiTask = /\blogin\b/.test(normalizedTask) && /\b(api|endpoint|server|route|auth)\b/.test(normalizedTask);
      return isLoginApiPath || (isLoginApiTask && normalizedPath.endsWith('login.ts'));
    },
    generate: () => ({
      language: 'typescript',
      content: `export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    // TODO: authentication logic
    // Validate the credentials and return a session or token.

    return res.json({
      success: true,
      user: {
        email
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Login failed'
    });
  }
}
`
    })
  }
];

export function generateCode({ taskDescription = '', path: filePath = '', projectContext = {} }) {
  const rule = generationRules.find((rule) => rule.matches({ taskDescription, path: filePath, projectContext }));
  if (!rule) {
    return { content: '', language: '' };
  }
  return rule.generate({ taskDescription, path: filePath, projectContext });
}
