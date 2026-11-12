export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe?: { user?: { id: number; first_name?: string; photo_url?: string }; start_param?: string; chat_type?: string; chat_instance?: string };
        version: string;
        platform: string;
        colorScheme: "light" | "dark";
        themeParams?: Record<string, string>;
        ready(): void;
        expand(): void;
        close(): void;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        setBottomBarColor(color: string): void;
        enableClosingConfirmation(): void;
        enableVerticalSwipes(): void;
        MainButton: {
          setText(text: string): void;
          setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
          show(): void;
          hide(): void;
          showProgress(leaveActive?: boolean): void;
          hideProgress(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        BackButton: {
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        HapticFeedback?: { impactOccurred(style: "light" | "medium" | "heavy"): void };
        openLink(url: string, options?: { try_instant_view?: boolean }): void;
        openTelegramLink(url: string): void;
      };
    };
  }
}
