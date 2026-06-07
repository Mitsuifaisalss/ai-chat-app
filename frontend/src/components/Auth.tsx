import React, { useState } from "react";

export function Auth({ onLogin }: { onLogin: (token: string, username: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "An error occurred");
        return;
      }
      if (isLogin) {
        onLogin(data.access_token, username);
      } else {
        setIsLogin(true);
        setError("Registration successful. Please log in.");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100 p-4">
      <div className="w-full max-w-md bg-zinc-800 p-8 rounded-xl shadow-lg border border-zinc-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-emerald-400">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-emerald-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded transition-colors"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-zinc-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-400 hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
