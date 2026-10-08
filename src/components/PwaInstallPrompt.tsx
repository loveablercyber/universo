import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "carolsol-pwa-install-dismissed";

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (window.location.pathname === "/app") return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || iosStandalone || sessionStorage.getItem(DISMISSED_KEY)) return;

    const timer = window.setTimeout(() => setVisible(true), 1800);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    const markInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) {
      setShowHelp(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallEvent(null);
  };

  return (
    <>
      {visible ? (
        <aside className="fixed bottom-4 left-1/2 z-[90] flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-copper/25 bg-[#4B3628] p-3 text-white shadow-2xl md:bottom-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#CB9A7B]/20 text-[#F2E8DD]">
            <Download size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-xs">Instale o Universo Carol Sol</strong>
            <span className="mt-0.5 block text-[10px] leading-4 text-white/65">
              Loja, cursos, agenda e sua conta em um só lugar.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-lg bg-[#CB9A7B] px-3 py-2 text-[10px] font-bold text-[#4B3628]"
          >
            INSTALAR
          </button>
          <button type="button" onClick={dismiss} aria-label="Fechar convite de instalação">
            <X size={16} />
          </button>
        </aside>
      ) : null}

      {showHelp ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-end bg-black/55 p-4 sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-help-title"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-[#FAF7F2] p-6 text-[#4B3628] shadow-2xl">
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              aria-label="Fechar instruções"
              className="absolute right-4 top-4 p-2"
            >
              <X size={18} />
            </button>
            <Share className="text-[#CB9A7B]" size={28} aria-hidden />
            <h2 id="pwa-help-title" className="mt-4 font-serif text-2xl">
              Adicione à tela inicial
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#4B3628]/75">
              <p>
                <strong>No iPhone ou iPad:</strong> toque em Compartilhar e escolha “Adicionar à
                Tela de Início”.
              </p>
              <p>
                <strong>No Android ou computador:</strong> abra o menu do navegador e escolha
                “Instalar app” ou “Adicionar à tela inicial”.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
