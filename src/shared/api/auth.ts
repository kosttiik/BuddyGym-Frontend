import { getRawInitData } from "@/shared/lib/telegram";
import { api, registerAuthRefresh, setToken } from "./client";
import type { AuthTelegramResponse } from "./types";

/* Outside Telegram the backend rejects this value; the MSW mock accepts it. */
const DEV_INIT_DATA = "mock-init-data";

export async function authenticate(): Promise<AuthTelegramResponse> {
  const initData = getRawInitData() ?? DEV_INIT_DATA;
  const res = await api.post<AuthTelegramResponse>("/auth/telegram", { init_data: initData });
  setToken(res.token);
  return res;
}

registerAuthRefresh(async () => {
  await authenticate();
});
