import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-gray-900">Wieża Magów</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{username}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Wyloguj
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-gray-500 text-sm">Dashboard w budowie...</p>
      </main>
    </div>
  );
}