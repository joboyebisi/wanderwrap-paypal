export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe?: { user?: { id: number; first_name?: string; photo_url?: string } };
        ready(): void;
        expand(): void;
        close(): void;
        HapticFeedback?: { impactOccurred(style: "light" | "medium" | "heavy"): void };
        openLink(url: string): void;
      };
    };
  }
}
