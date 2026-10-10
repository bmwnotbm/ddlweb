/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F3D2A",
        paper: "#F1F7F3",
        surface: "#FFFFFF",
        line: "#D2E3D8",
        "line-strong": "#A5C2B0",
        muted: "#4A6455",
        leaf: "#1E8E5A",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      borderRadius: {
        none: "0px",
      },
    },
  },
  plugins: [],
};
