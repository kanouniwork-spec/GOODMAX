import { Archivo, IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";

export const fontDisplay = Archivo({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"], display: "swap" });
export const fontBody = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
export const fontMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"], display: "swap" });
export const fontArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", weight: ["400", "500", "600", "700"], display: "swap" });

export const fontVars = [fontDisplay.variable, fontBody.variable, fontMono.variable, fontArabic.variable].join(" ");
