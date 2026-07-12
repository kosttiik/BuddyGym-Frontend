/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MOCK?: string;
  /* bot that hosts the mini app, used to build t.me invite links */
  readonly VITE_BOT_USERNAME?: string;
  /* mini app short name, when the bot serves several apps */
  readonly VITE_MINIAPP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
