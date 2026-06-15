import React from 'react';
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
