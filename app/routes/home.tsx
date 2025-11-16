import { useState, useEffect } from "react";

// Use relative path in production, absolute in development
const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:4000/api";

interface User {
  id: number;
  name: string;
  encrypted: {
    email: string;
    phone: string;
    address: string;
  };
  decrypted: {
    email: string;
    phone: string;
    address: string;
  };
  createdAt: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
      setError("");
    } catch (err) {
      setError("データの取得に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      setEncryptionKey(data.encryptionKey);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create user");

      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
      });

      await fetchUsers();
    } catch (err) {
      setError("ユーザーの作成に失敗しました");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このユーザーを削除しますか?")) return;

    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      await fetchUsers();
    } catch (err) {
      setError("ユーザーの削除に失敗しました");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>Prisma Field Encryption Sample</h1>
      <p className="subtitle">
        暗号化されたデータと復号化されたデータをリアルタイムで比較
      </p>

      <div className="warning-banner">
        <strong>⚠️ デモ用途のみ</strong>
        <p>
          このアプリケーションは学習・検証用のサンプルです。
          <br />
          暗号化キーが画面に表示されるため、本番環境では絶対に使用しないでください。
        </p>
      </div>

      {encryptionKey && (
        <div className="encryption-key-display">
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            使用中の暗号化キー:
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              wordBreak: "break-all",
              padding: "8px",
              background: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            {encryptionKey}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="form-container">
        <h2 style={{ marginBottom: "20px" }}>新しいユーザーを追加</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>名前</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>メールアドレス (暗号化)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>電話番号 (暗号化)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>住所 (暗号化)</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>
          </div>
          <button type="submit">ユーザーを追加</button>
        </form>
      </div>

      <h2 style={{ marginBottom: "20px" }}>登録ユーザー</h2>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : users.length === 0 ? (
        <div className="loading">ユーザーが登録されていません</div>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-header">
                <div>
                  <div className="user-name">{user.name}</div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(user.id)}
                >
                  削除
                </button>
              </div>

              <div className="data-comparison">
                <div className="data-section encrypted">
                  <div className="section-title">暗号化データ (DB保存形式)</div>
                  <div className="data-row">
                    <div className="data-label">Email</div>
                    <div className="data-value">{user.encrypted.email}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Phone</div>
                    <div className="data-value">{user.encrypted.phone}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Address</div>
                    <div className="data-value">{user.encrypted.address}</div>
                  </div>
                </div>

                <div className="data-section decrypted">
                  <div className="section-title">復号化データ (アプリ表示)</div>
                  <div className="data-row">
                    <div className="data-label">Email</div>
                    <div className="data-value">{user.decrypted.email}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Phone</div>
                    <div className="data-value">{user.decrypted.phone}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Address</div>
                    <div className="data-value">{user.decrypted.address}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
