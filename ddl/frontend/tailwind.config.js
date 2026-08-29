/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0A",
        paper: "#F6F5F1",
        surface: "#FFFFFF",
        line: "#DAD8D0",
        "line-strong": "#B9B7AE",
        muted: "#5C5A54",
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
