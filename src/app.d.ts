declare global {
  declare const __APP_VERSION__: string;

  namespace App {
    interface Platform {
      env?: Record<string, string | undefined>;
    }
  }
}

export {};
