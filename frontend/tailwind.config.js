/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6bff",
          600: "#2f56db",
          700: "#2543ad",
        },
      },
    },
  },
  plugins: [],
};
