import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gkjwkucur.app",
  appName: "GKJW Kucur",
  webDir: "public",
  server: {
    url: "https://webappgkjw.vercel.app/login",
    cleartext: false,
    allowNavigation: ["webappgkjw.vercel.app"],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
