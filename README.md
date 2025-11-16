# Prisma Field Encryption Sample

このプロジェクトは、Prismaとprisma-field-encryptionを使用したデータ暗号化のサンプルアプリケーションです。

## 機能

- PostgreSQLデータベースでのデータ暗号化
- prisma-field-encryptionを使用した自動暗号化/復号化
- React Router v7を使用したモダンなフロントエンド
- 暗号化データと復号化データのリアルタイム比較表示
- Docker Composeによる簡単な環境構築

## 技術スタック

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + React Router v7
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Encryption**: prisma-field-encryption
- **Container**: Docker + Docker Compose

## セットアップ

### 起動方法

```bash
docker compose up --build
```

これにより、PostgreSQLとアプリケーションが起動します。

### アクセスURL

- **アプリケーション**: http://localhost:4000

※ フロントエンドとバックエンドAPIは同じポートで動作します（本番モード）

### 停止方法

```bash
# Ctrl+C で停止後、コンテナを削除
docker compose down

# データベースのボリュームも削除する場合
docker compose down -v
```

## プロジェクト構造

```
.
├── app/                    # React Router v7 フロントエンド
│   ├── routes/
│   │   └── home.tsx       # メインページ
│   ├── root.tsx           # ルートレイアウト
│   └── routes.ts          # ルート定義
├── server/                 # バックエンドサーバー
│   ├── index.ts           # Express API サーバー
│   └── db.ts              # Prisma + 暗号化設定
├── prisma/
│   └── schema.prisma      # データベーススキーマ
├── scripts/                # ユーティリティスクリプト
│   └── migrate-encryption-key.ts  # 暗号化キー移行スクリプト
├── compose.yml             # Docker Compose設定
├── Dockerfile              # アプリケーションコンテナ
└── package.json
```

## 暗号化対象フィールド

以下のフィールドが自動的に暗号化されます:

- `email`: メールアドレス
- `phone`: 電話番号
- `address`: 住所

これらのフィールドには、Prismaスキーマで`/// @encrypted`コメントが付けられています。

## APIエンドポイント

- `GET /api/users` - 全ユーザーの取得(暗号化・復号化データ両方)
- `POST /api/users` - 新規ユーザー作成
- `DELETE /api/users/:id` - ユーザー削除
- `GET /api/health` - ヘルスチェック

## データベースの確認

Prisma Studioでデータベースの内容を確認できます:

```bash
docker compose exec app npx prisma studio
```

ブラウザで http://localhost:5555 が開き、暗号化された状態のデータを直接確認できます。

注意: Prisma Studioを使用する場合は、アプリケーションが起動している状態で別のターミナルから上記コマンドを実行してください。

## 使い方

1. ブラウザで http://localhost:4000 にアクセス
2. フォームに以下の情報を入力してユーザーを追加:
   - 名前
   - メールアドレス（暗号化される）
   - 電話番号（暗号化される）
   - 住所（暗号化される）
3. 登録されたユーザーが表示され、暗号化データと復号化データを並べて確認できます

## 暗号化キーについて

現在の暗号化キーは`compose.yml`に直接記述されています。本番環境で使用する場合は、以下の点に注意してください:

- `ENCRYPTION_KEY`は安全な方法で管理してください（環境変数、シークレット管理サービスなど）
- 暗号化キーは`k1.aesgcm256.`で始まる特定のフォーマットが必要です（@47ng/cloakライブラリのフォーマット）
- 暗号化キーを変更すると、既存の暗号化データは復号化できなくなります
- 本サンプルは学習用途であり、本番環境で使用する場合は適切なセキュリティ対策を実施してください

### 新しい暗号化キーの生成

```bash
docker compose run --rm app node -e "import('@47ng/cloak').then(m => console.log(m.generateKey()))"
```

生成されたキーを`compose.yml`の`ENCRYPTION_KEY`環境変数に設定してください。

### 暗号化キーの変更と既存データの移行

暗号化キーを変更する場合、既存データは旧キーで復号化できなくなるため、以下の手順で移行が必要です。

このリポジトリには移行用のスクリプト `scripts/migrate-encryption-key.ts` が含まれています。

#### 移行の仕組み

1. **旧キー**で暗号化されたデータを**復号化**して読み取る
2. **新キー**で再度**暗号化**してデータベースに保存
3. 両方のキーを使用する2つのPrismaクライアントを利用

#### 実行手順

**1. データベースのバックアップを取得**

```bash
# PostgreSQLコンテナからバックアップを作成
docker compose exec postgres pg_dump -U prisma prisma_encryption > backup.sql
```

**2. 新しい暗号化キーを生成**

```bash
docker compose run --rm app node -e "import('@47ng/cloak').then(m => console.log(m.generateKey()))"
```

出力例: `k1.aesgcm256.NEW_KEY_HERE...`

**3. compose.ymlを編集して両方のキーを設定**

`OLD_ENCRYPTION_KEY` を追加し、`ENCRYPTION_KEY` を新しいキーに変更:

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://prisma:prisma@postgres:5432/prisma_encryption?schema=public
  - ENCRYPTION_KEY=k1.aesgcm256.NEW_KEY_HERE... # 新しいキー
  - OLD_ENCRYPTION_KEY=k1.aesgcm256.kxfqDwqEABJ9vw0Ch0rEaik7-d23uK3OHs7I-rFpKEo= # 旧キー
  - PORT=4000
```

**4. アプリケーションを起動**

```bash
docker compose up -d
```

**5. 移行スクリプトを実行**

```bash
docker compose exec app npx tsx scripts/migrate-encryption-key.ts
```

実行結果の例:

```
🔄 暗号化キー移行を開始します...

📥 既存ユーザーデータを取得中...
✓ 3件のユーザーを取得しました

🔐 データを新しいキーで再暗号化中...
  ✓ ユーザーID 1 (山田太郎) を移行しました
  ✓ ユーザーID 2 (佐藤花子) を移行しました
  ✓ ユーザーID 3 (鈴木一郎) を移行しました

📊 移行結果:
  成功: 3件
  失敗: 0件

✅ 移行が完了しました！
```

**6. compose.ymlからOLD_ENCRYPTION_KEYを削除**

移行が成功したら、`OLD_ENCRYPTION_KEY` の行を削除:

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://prisma:prisma@postgres:5432/prisma_encryption?schema=public
  - ENCRYPTION_KEY=k1.aesgcm256.NEW_KEY_HERE... # 新しいキーのみ
  - PORT=4000
```

**7. アプリケーションを再起動**

```bash
docker compose restart app
```

**8. 動作確認**

ブラウザで http://localhost:4000 にアクセスし、既存データが正しく表示されることを確認してください。

#### 注意事項

- ⚠️ **移行前に必ずデータベースのバックアップを取得してください**
- 移行中はアプリケーションへのアクセスを制限することを推奨
- 移行が完了し、動作確認が取れるまで旧キーは削除しないでください
- 大量のデータがある場合は、スクリプトにバッチ処理の実装を検討してください
- エラーが発生した場合は、バックアップからデータベースを復元できます

#### バックアップからの復元方法

```bash
# コンテナを停止
docker compose down

# ボリュームを削除して初期化
docker compose down -v

# コンテナを起動
docker compose up -d postgres

# バックアップを復元
cat backup.sql | docker compose exec -T postgres psql -U prisma prisma_encryption
```
