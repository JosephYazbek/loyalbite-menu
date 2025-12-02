'use client';

import { useState, FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push('/admin');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form
        onSubmit={signIn}
        className="bg-gray-800 p-8 rounded-xl space-y-4 w-full max-w-sm"
      >
        <h1 className="text-xl font-bold text-center">Admin Login</h1>

        <input
          className="w-full p-2 rounded bg-gray-700"
          placeholder="Email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-2 rounded bg-gray-700"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-500 p-2 rounded font-semibold"
        >
          Login
        </button>
      </form>
    </div>
  );
}
