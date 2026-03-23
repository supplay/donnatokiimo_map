// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'flyerDrive',
  access: (allow) => ({
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete']), // 店主（ログイン済）はフル操作
      allow.guest.to(['read']) // お客様（未ログイン）は見れるだけ
    ]
  })
});