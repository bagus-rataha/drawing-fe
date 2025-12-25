/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Keep existing shadcn colors for compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "#4f46e5",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // New design system colors
        navy: "#0a2540",
        success: "#059669",
        warning: "#d97706",
        error: "#dc2626",
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f6f9fc",
        },
        "border-custom": "#e6ebf1",
        content: {
          DEFAULT: "#0a2540",
          secondary: "#425466",
          muted: "#6b7c93",
        },
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        md: "8px",
        sm: "4px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(10,37,64,0.08)",
        "card-hover": "0 4px 16px rgba(10,37,64,0.12)",
        modal: "0 20px 40px rgba(10,37,64,0.2)",
      },
    },
  },
  plugins: [],
}
