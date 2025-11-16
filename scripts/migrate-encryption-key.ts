import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

const OLD_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_KEY = process.env.ENCRYPTION_KEY;

if (!OLD_KEY || !NEW_KEY) {
  console.error('❌ エラー: OLD_ENCRYPTION_KEY と ENCRYPTION_KEY の両方を環境変数に設定してください');
  process.exit(1);
}

// 旧キーでデータを読み込むクライアント
const oldPrisma = new PrismaClient().$extends(
  fieldEncryptionExtension({ encryptionKey: OLD_KEY })
);

// 新キーでデータを書き込むクライアント
const newPrisma = new PrismaClient().$extends(
  fieldEncryptionExtension({ encryptionKey: NEW_KEY })
);

async function migrateEncryptionKey() {
  console.log('🔄 暗号化キー移行を開始します...\n');

  try {
    // 旧キーで全ユーザーを復号化して取得
    console.log('📥 既存ユーザーデータを取得中...');
    const users = await oldPrisma.user.findMany();
    console.log(`✓ ${users.length}件のユーザーを取得しました\n`);

    if (users.length === 0) {
      console.log('ℹ️  移行するデータがありません');
      return;
    }

    // 各ユーザーを新キーで再暗号化
    console.log('🔐 データを新しいキーで再暗号化中...');
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await newPrisma.user.update({
          where: { id: user.id },
          data: {
            email: user.email,
            phone: user.phone,
            address: user.address,
          },
        });
        successCount++;
        console.log(`  ✓ ユーザーID ${user.id} (${user.name}) を移行しました`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ ユーザーID ${user.id} の移行に失敗しました:`, error);
      }
    }

    console.log('\n📊 移行結果:');
    console.log(`  成功: ${successCount}件`);
    console.log(`  失敗: ${errorCount}件`);

    if (errorCount === 0) {
      console.log('\n✅ 移行が完了しました！');
    } else {
      console.log('\n⚠️  一部のデータの移行に失敗しました');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 移行中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }
}

migrateEncryptionKey();
