import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useJoinByCode } from "@/entities/room";
import { ApiError } from "@/shared/api/client";
import { useI18n } from "@/shared/i18n";
import { IconClipboard, IconLink } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { readClipboard } from "@/shared/lib/telegram";
import {
  AppHeader,
  Button,
  CODE_LENGTH,
  CodeInput,
  Page,
  sanitizeCode,
  useToast,
} from "@/shared/ui";
import styles from "./JoinPage.module.css";

export function JoinPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const showToast = useToast();
  const joinByCode = useJoinByCode();
  const { code: initialCode } = useSearch({ from: "/join" });

  const [code, setCode] = useState(initialCode ?? "");
  const [shakeKey, setShakeKey] = useState(0);

  const complete = code.length === CODE_LENGTH;

  const paste = async () => {
    const text = await readClipboard();
    if (text) {
      setCode(sanitizeCode(text));
    } else {
      showToast({ title: t.joinByCode.pasteFailed, tone: "error" });
    }
  };

  const submit = () => {
    joinByCode.mutate(code, {
      onSuccess: (room) => {
        hapticNotify("success");
        void navigate({ to: "/rooms/$roomId", params: { roomId: String(room.id) }, replace: true });
      },
      onError: (error) => {
        hapticNotify("error");
        setShakeKey((k) => k + 1);
        const notFound = error instanceof ApiError && error.status === 404;
        showToast({
          title: notFound ? t.joinByCode.notFound : t.errors.generic,
          tone: "error",
        });
      },
    });
  };

  return (
    <>
      <AppHeader variant="nested" title={t.joinByCode.title} />
      <Page>
        <p className={styles.subtitle}>{t.joinByCode.subtitle}</p>

        <CodeInput value={code} onChange={setCode} shakeKey={shakeKey} />
        <p className={styles.hint}>{t.joinByCode.hint}</p>

        <Button variant="ghost" size="sm" icon={<IconClipboard size={14} />} onClick={paste}>
          {t.joinByCode.paste}
        </Button>

        <div className={styles.deepLink}>
          <IconLink size={15} className={styles.deepLinkIcon} />
          <span>{t.joinByCode.deepLink}</span>
        </div>

        <div className={styles.submitBlock}>
          <Button block disabled={!complete || joinByCode.isPending} onClick={submit}>
            {t.joinByCode.submit}
          </Button>
          {!complete && <span className={styles.submitHint}>{t.joinByCode.fillAll}</span>}
        </div>
      </Page>
    </>
  );
}
