---
title: "Prismaでのフィールドレベル暗号化と、暗号化のキー移行をどうするのか試してみた"
emoji: "🔐"
type: "tech"
topics: ["prisma", "encryption", "typescript", "docker", "security"]
published: false
---

## はじめに

現在担当しているプロダクトでPrismaを使っており、個人情報などの機密データを暗号化して保存する必要がありました。

:::message
Prisma自体について詳しく知りたい方は、こちらの記事がとてもわかり易くまとめていただいておりますので、ぜひご確認ください。：
[Next.js と Prisma で学ぶフルスタック Web 開発](https://zenn.dev/sonicmoov/articles/86b62b88206e27)
:::

最初はcrypto-jsを使って暗号化・復号化の処理を書いており、今思うと少しお恥ずかしいのですが...😅

```typescript
// こんな感じで自前実装していました
const encryptedEmail = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
```

運用していく中で、以下のような課題に直面しました:

- **どのフィールドが暗号化されているか把握しづらい**: 暗号化処理がアプリケーションコード側に散在し、どのデータが暗号化対象なのか一目で分からない
- **暗号化・復号化の処理漏れのリスク**: データ保存時に暗号化し忘れたり、取得時に復号化し忘れたりするヒューマンエラーの可能性
- **暗号化キーの変更対応**: セキュリティ要件で定期的な暗号化キーのローテーションが必要だが、既存データの移行手順が不明確

「もっといい方法ないかな...」と思って調べたところ、\*_実はPrismaには暗号化の仕組みがあるわけでして・・・_！

[prisma-field-encryption](https://github.com/47ng/prisma-field-encryption)というライブラリを使うことで、スキーマに`/// @encrypted`というコメントを追加するだけで、自動的に暗号化・復号化が行われるようになります。最初からPrisma関連のライブラリを調べればもっと早くわかったことですが、これも１つの勉強になったということで・・・。

そんなわけでして本記事では、復習も兼ねてprisma-field-encryptionを使った暗号化のサンプルリポジトリを作成し、
特に**暗号化キーが変わった時にどう対応するか**を実際に練習してみた内容をまとめます。

:::message
この記事で作成したサンプルリポジトリは以下で公開しています。
https://github.com/tamoco-mocomoco/prisma-encryption-sample
:::

## 自前実装の課題

最初は以下のような形で、アプリケーション側で暗号化・復号化を手動で行っていました:

```typescript
import { encrypt, decrypt } from "./crypto-utils";

// データ保存時
const user = await prisma.user.create({
  data: {
    name: "John Doe",
    email: encrypt("john@example.com"), // 手動で暗号化
    phone: encrypt("090-1234-5678"),
  },
});

// データ取得時
const users = await prisma.user.findMany();
const decryptedUsers = users.map((user) => ({
  ...user,
  email: decrypt(user.email), // 手動で復号化
  phone: decrypt(user.phone),
}));
```

この方法の問題点:

1. **暗号化対象フィールドの管理が困難**: どのフィールドを暗号化すべきか、コードレビューやドキュメントに頼るしかない
2. **処理の一貫性が保証できない**: 開発者が暗号化を忘れると、平文でデータが保存されてしまう
3. **型安全性の欠如**: TypeScriptの型では暗号化されたフィールドと平文のフィールドを区別できない
4. **テストの複雑化**: 暗号化・復号化処理を毎回テストする必要がある

## prisma-field-encryptionとは

[prisma-field-encryption](https://github.com/47ng/prisma-field-encryption)は、PrismaのClient Extensionを使用して、特定のフィールドを自動的に暗号化・復号化するライブラリです。

主な特徴:

- **スキーマベースの定義**: `/// @encrypted`コメントで暗号化対象を明示
- **自動暗号化・復号化**: Prismaクライアント経由のすべての操作で自動処理
- **透過的な使用感**: アプリケーションコードは平文として扱える
- **AES-256-GCM暗号化**: 強力な暗号化アルゴリズムを使用

```prisma
model User {
  id      Int    @id @default(autoincrement())
  name    String
  email   String /// @encrypted
  phone   String /// @encrypted
  address String /// @encrypted
}
```

このようにスキーマに記述するだけで、暗号化が必要なフィールドが一目瞭然になります。

## サンプルアプリケーションの構成

暗号化の動作を視覚的に確認できるサンプルアプリケーションを作成しました。

### 技術スタック

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + React Router v7
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Encryption**: prisma-field-encryption
- **Container**: Docker + Docker Compose

### アーキテクチャ

```
┌─────────────────────────────────────┐
│   React Router v7 Frontend          │
│   - ユーザー登録フォーム             │
│   - 暗号化/復号化データの並列表示    │
└─────────────────────────────────────┘
              ↓ HTTP
┌─────────────────────────────────────┐
│   Express API Server                │
│   - 2つのPrismaクライアント          │
│     1. 通常版（暗号化されたまま）    │
│     2. 拡張版（自動復号化）          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   PostgreSQL                        │
│   - 暗号化されたデータを保存         │
└─────────────────────────────────────┘
```

<!-- 📸 スクリーンショット挿入ポイント1: アプリケーションのトップ画面
警告バナー、暗号化キー表示、ユーザー登録フォームが表示されている画面 -->

### 特徴的な実装

このサンプルでは、**暗号化されたデータと復号化されたデータを並べて表示**することで、暗号化の動作を理解しやすくしています。

```typescript
// 通常のPrismaクライアント（暗号化されたまま）
export const prisma = new PrismaClient();

// 暗号化拡張を適用したクライアント（自動復号化）
export const encryptedPrisma = prisma.$extends(
  fieldEncryptionExtension({
    encryptionKey: process.env.ENCRYPTION_KEY || "",
  })
);
```

APIエンドポイントでは両方のクライアントを使用して、同一データの暗号化状態と復号化状態を返します:

```typescript
app.get("/api/users", async (req, res) => {
  // 暗号化されたままのデータ
  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  // 復号化されたデータ
  const decryptedUsers = await encryptedPrisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  // 両方を結合して返す
  const combinedUsers = rawUsers.map((rawUser, index) => ({
    id: rawUser.id,
    name: rawUser.name,
    encrypted: {
      email: rawUser.email,
      phone: rawUser.phone,
      address: rawUser.address,
    },
    decrypted: {
      email: decryptedUsers[index]?.email || "",
      phone: decryptedUsers[index]?.phone || "",
      address: decryptedUsers[index]?.address || "",
    },
    createdAt: rawUser.createdAt,
  }));

  res.json(combinedUsers);
});
```

<!-- 📸 スクリーンショット挿入ポイント2: ユーザーデータの表示画面
暗号化データ（DB保存形式）と復号化データ（アプリ表示）が並んで表示されている画面
例:
- 暗号化: v1.aesgcm256.6ccd7ff1.eURPHWOqUnRnFUnZ...
- 復号化: tanaka@test.com -->

## 暗号化の仕組み

prisma-field-encryptionは、[@47ng/cloak](https://github.com/47ng/cloak)ライブラリを使用してAES-256-GCM暗号化を行います。

### 暗号化キーの生成

暗号化キーは以下のコマンドで生成できます:

```bash
docker compose run --rm app node -e "import('@47ng/cloak').then(m => console.log(m.generateKey()))"
```

出力例:

```
k1.aesgcm256.zSsD_ZQwCqg97IqVIKIF5RkgHlx_qGF5lOXRkEaasws=
```

このキーを環境変数として設定します:

```yaml
# compose.yml
environment:
  - ENCRYPTION_KEY=k1.aesgcm256.zSsD_ZQwCqg97IqVIKIF5RkgHlx_qGF5lOXRkEaasws=
```

### 暗号化されたデータの形式

データベースには以下のような形式で保存されます:

```
v1.aesgcm256.6ccd7ff1.eURPHWOqUnRnFUnZ.jSTYAaBI8j7N1g50KrjAQUwUgesaoTxTFasb2f3lRQ==
```

フォーマット:

```
v1.aesgcm256.[nonce].[ciphertext]
```

## 暗号化キーの移行

ここまででprisma-field-encryptionを使った基本的なサンプルは完成しました。でも、「せっかくサンプルを作ったんだから、もう一歩踏み込んでみよう」と思いました。

実際の運用を考えると、セキュリティのベストプラクティスとして暗号化キーは定期的にローテーションすることが推奨されます。でも、**既存データは旧キーで暗号化されているため、そのままでは復号化できません**。

「暗号化キーを変更するときって、実際どうやるんだろう...？」

これは将来必ず直面する課題だと思い、実際に試してみることにしました。この問題を解決するため、**暗号化キー移行スクリプト**を作成しました。

### 移行の仕組み

キー移行は以下の流れで行います:

```
┌─────────────────────────────────────┐
│  旧キーで暗号化されたデータ          │
│  v1.aesgcm256.b3197cd1.xxx...       │
└─────────────────────────────────────┘
              ↓ 旧キーで復号化
┌─────────────────────────────────────┐
│  平文データ                         │
│  tanaka@test.com                    │
└─────────────────────────────────────┘
              ↓ 新キーで暗号化
┌─────────────────────────────────────┐
│  新キーで暗号化されたデータ          │
│  v1.aesgcm256.6ccd7ff1.xxx...       │
└─────────────────────────────────────┘
```

### 移行スクリプトの実装

2つのPrismaクライアントを使用して、旧キーでの復号化と新キーでの暗号化を行います:

```typescript
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";

const OLD_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_KEY = process.env.ENCRYPTION_KEY;

// 旧キーでデータを読み込むクライアント
const oldPrisma = new PrismaClient().$extends(
  fieldEncryptionExtension({ encryptionKey: OLD_KEY })
);

// 新キーでデータを書き込むクライアント
const newPrisma = new PrismaClient().$extends(
  fieldEncryptionExtension({ encryptionKey: NEW_KEY })
);

async function migrateEncryptionKey() {
  console.log("🔄 暗号化キー移行を開始します...\n");

  // 旧キーで全ユーザーを復号化して取得
  const users = await oldPrisma.user.findMany();
  console.log(`✓ ${users.length}件のユーザーを取得しました\n`);

  // 各ユーザーを新キーで再暗号化
  for (const user of users) {
    await newPrisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email, // 復号化された値が
        phone: user.phone, // 新キーで
        address: user.address, // 再暗号化される
      },
    });
    console.log(`  ✓ ユーザーID ${user.id} (${user.name}) を移行しました`);
  }

  console.log("\n✅ 移行が完了しました！");
}

migrateEncryptionKey();
```

### 移行手順

実際の移行は以下の手順で行います:

**1. データベースのバックアップ**

```bash
docker compose exec -T postgres pg_dump -U prisma prisma_encryption > backup.sql
```

**2. 新しい暗号化キーを生成**

```bash
docker compose run --rm app node -e "import('@47ng/cloak').then(m => console.log(m.generateKey()))"
```

**3. compose.ymlに両方のキーを設定**

```yaml
environment:
  - ENCRYPTION_KEY=k1.aesgcm256.NEW_KEY_HERE... # 新しいキー
  - OLD_ENCRYPTION_KEY=k1.aesgcm256.OLD_KEY... # 旧キー
```

**4. 移行スクリプトを実行**

```bash
docker compose exec app npx tsx scripts/migrate-encryption-key.ts
```

<!-- 📸 スクリーンショット挿入ポイント3: 移行スクリプトの実行結果
ターミナルに表示される移行の進捗ログ
例:
🔄 暗号化キー移行を開始します...
📥 既存ユーザーデータを取得中...
✓ 1件のユーザーを取得しました
🔐 データを新しいキーで再暗号化中...
  ✓ ユーザーID 1 (田中太郎) を移行しました
📊 移行結果:
  成功: 1件
  失敗: 0件
✅ 移行が完了しました！ -->

**5. 動作確認**

移行後、既存データが新キーで正しく復号化されることを確認します:

```bash
curl http://localhost:4000/api/users | jq
```

<!-- 📸 スクリーンショット挿入ポイント4: 移行後のブラウザ画面
新しい暗号化キーが表示され、既存データが正常に表示されている画面 -->

**6. 旧キーの削除**

動作確認が取れたら、`compose.yml`から`OLD_ENCRYPTION_KEY`を削除します:

```yaml
environment:
  - ENCRYPTION_KEY=k1.aesgcm256.NEW_KEY_HERE... # 新キーのみ
```

## 実際に移行を試してみた

実際にサンプルアプリケーションで暗号化キーの移行を実行してみました。

### 移行前のデータ

```json
{
  "id": 1,
  "name": "田中太郎",
  "encrypted": {
    "email": "v1.aesgcm256.b3197cd1.4mV45G4ofWaBMt_6.noaAwyt8A8uVW1JI1z...",
    "phone": "v1.aesgcm256.b3197cd1.tQZ85_SyR702P2AD.MQz54r_zl18aYVh8...",
    "address": "v1.aesgcm256.b3197cd1.ezi5_oBAmxLkDb-m.f5BCZHCks-QlswbbW-..."
  },
  "decrypted": {
    "email": "tanaka@test.com",
    "phone": "09011112222",
    "address": "東京都霞が関"
  }
}
```

暗号化データは`b3197cd1`というnonceで始まっています。

### 移行スクリプト実行

```bash
$ docker compose exec app npx tsx scripts/migrate-encryption-key.ts

🔄 暗号化キー移行を開始します...

📥 既存ユーザーデータを取得中...
✓ 1件のユーザーを取得しました

🔐 データを新しいキーで再暗号化中...
  ✓ ユーザーID 1 (田中太郎) を移行しました

📊 移行結果:
  成功: 1件
  失敗: 0件

✅ 移行が完了しました！
```

### 移行後のデータ

```json
{
  "id": 1,
  "name": "田中太郎",
  "encrypted": {
    "email": "v1.aesgcm256.6ccd7ff1.eURPHWOqUnRnFUnZ.jSTYAaBI8j7N1g50...",
    "phone": "v1.aesgcm256.6ccd7ff1.e5iz6mrftZTwRYSO.6Zse2Yw_M9ZGF2eB...",
    "address": "v1.aesgcm256.6ccd7ff1.lPsN-Q_EWA0LgqEw.4_G0NmBH6NKCiHBt..."
  },
  "decrypted": {
    "email": "tanaka@test.com",
    "phone": "09011112222",
    "address": "東京都霞が関"
  }
}
```

暗号化データのnonceが`6ccd7ff1`に変わり、新しいキーで暗号化されていることが確認できます。**復号化後のデータは変わらず正しく取得できています**。

## 実装のポイントと学び

### 1. デモ用途であることの明示

このサンプルは学習目的のため、通常は絶対に行わない**暗号化キーのブラウザ表示**を実装しています。本番環境では厳禁です。

そのため、目立つ警告バナーを表示しています:

```tsx
<div className="warning-banner">
  <strong>⚠️ デモ用途のみ</strong>
  <p>
    このアプリケーションは学習・検証用のサンプルです。
    <br />
    暗号化キーが画面に表示されるため、本番環境では絶対に使用しないでください。
  </p>
</div>
```

### 2. Docker Composeでの環境変数管理

移行時には複数のキーを扱う必要があるため、compose.ymlで環境変数を直接管理する方が分かりやすいです:

```yaml
volumes:
  - ./prisma:/app/prisma
  - ./scripts:/app/scripts # 移行スクリプトをマウント
```

scriptsディレクトリをマウントすることで、コンテナを再ビルドせずにスクリプトを実行できます。

### 3. バックアップの重要性

暗号化キーの移行は不可逆的な操作です。必ずバックアップを取得してから実行しましょう:

```bash
# バックアップ
docker compose exec -T postgres pg_dump -U prisma prisma_encryption > backup.sql

# 復元が必要な場合
cat backup.sql | docker compose exec -T postgres psql -U prisma prisma_encryption
```

### 4. prisma db push の使用

このサンプルではマイグレーションファイルを使わず、`prisma db push`でスキーマを直接反映しています:

```yaml
command: sh -c "npx prisma generate && npx prisma db push --accept-data-loss && npm start"
```

これは学習用リポジトリとして適切ですが、本番環境ではマイグレーションファイルを使用してスキーマ変更を管理すべきです。

## 課題と今後の改善点

今回のサンプルで暗号化キーの移行は成功しましたが、実際に本番運用を考えると、いくつか課題が残っています。

### 1. 移行失敗時のリカバリ

現在のスクリプトでは、途中でエラーが発生した場合の対応が不十分です:

```typescript
// 現在の実装
for (const user of users) {
  await newPrisma.user.update({
    /* ... */
  });
}
```

**問題点:**

- 100件中50件目で失敗した場合、どこまで移行済みか分からない
- 再実行すると、既に移行済みのデータも再度処理してしまう
- ロールバックの仕組みがない

**改善案:**

```typescript
// 移行状態を記録するテーブルを作成
model MigrationStatus {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  migrated  Boolean  @default(false)
  migratedAt DateTime?
}

// スクリプトを冪等性のある実装に
async function migrateEncryptionKey() {
  const users = await oldPrisma.user.findMany({
    where: {
      migrationStatus: { migrated: false } // 未移行のみ
    }
  });

  for (const user of users) {
    try {
      await prisma.$transaction(async (tx) => {
        // データ移行
        await newPrisma.user.update({ /* ... */ });
        // 状態を記録
        await tx.migrationStatus.upsert({ /* ... */ });
      });
    } catch (error) {
      console.error(`Failed for user ${user.id}:`, error);
      // 次のユーザーに続行
    }
  }
}
```

### 2. 大量データの移行

現在の実装では、全データを一度に処理します:

```typescript
const users = await oldPrisma.user.findMany(); // 全件取得
```

**問題点:**

- データが100万件ある場合、メモリに全て載せるのは現実的でない
- 移行中はアプリケーションを停止する必要がある
- ダウンタイムが長くなる

**改善案1: バッチ処理**

```typescript
const BATCH_SIZE = 1000;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const users = await oldPrisma.user.findMany({
    skip: offset,
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  });

  if (users.length === 0) {
    hasMore = false;
    continue;
  }

  // バッチ単位で処理
  for (const user of users) {
    await newPrisma.user.update({
      /* ... */
    });
  }

  offset += BATCH_SIZE;
  console.log(`Processed ${offset} users...`);
}
```

**改善案2: ブルー/グリーンデプロイメント方式**

より高度な方法として、ダウンタイムを最小化する戦略も考えられます:

1. **事前準備**: アプリケーションを二重書き込みモードに変更

   ```typescript
   // 新規データは両方のキーで保存
   await oldPrisma.user.create({ data: encryptWithOldKey(data) });
   await newPrisma.user.create({ data: encryptWithNewKey(data) });
   ```

2. **段階的移行**: バックグラウンドで既存データを移行

   ```bash
   # 営業時間外に少しずつ移行
   cron: 0 2 * * * /app/scripts/migrate-batch.sh
   ```

3. **切り替え**: 全データの移行完了後、読み取りを新キーに切り替え

4. **旧データ削除**: 一定期間後に旧キーのデータを削除

### 3. データ整合性の検証

移行後、データが正しく移行されたかを検証する仕組みも必要です:

```typescript
async function verifyMigration() {
  const oldData = await oldPrisma.user.findMany();
  const newData = await newPrisma.user.findMany();

  for (let i = 0; i < oldData.length; i++) {
    if (oldData[i].email !== newData[i].email) {
      console.error(`Mismatch for user ${oldData[i].id}`);
    }
  }

  console.log("✅ Verification complete");
}
```

これらの課題は、今回のサンプルでは実装しませんでしたが、本番運用では必ず考慮すべきポイントになりそうです。

## まとめ

prisma-field-encryptionを使用することで、以下のメリットが得られました:

✅ **スキーマで暗号化対象が明確**: `/// @encrypted`コメントで一目瞭然
✅ **自動暗号化・復号化**: アプリケーションコードは平文として扱える
✅ **型安全**: TypeScriptの恩恵を受けられる
✅ **テストが簡潔**: 暗号化処理を意識する必要がない
✅ **暗号化キーの移行も実現可能**: 適切な手順で既存データを保護したまま移行できる

特に、暗号化キーの移行を実際に試せたことで、もう一歩深く学びになったと思っています！

### 参考リンク

- [サンプルリポジトリ](https://github.com/tamoco-mocomoco/prisma-encryption-sample)
- [prisma-field-encryption](https://github.com/47ng/prisma-field-encryption)
- [@47ng/cloak](https://github.com/47ng/cloak)
- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)

暗号化は複雑に見えますが、適切なツールを使うことでシンプルに実装できます。ぜひこのサンプルを動かして、暗号化の仕組みを体験してみてください！
