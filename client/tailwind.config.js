/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        belt: '#3B82F6',      // blue-500
        dock: '#F97316',      // orange-500
        unload: '#22C55E',    // green-500
        swing: '#6B7280',     // gray-500
        coverage: '#EF4444',  // red-500
      },
    },
  },
  plugins: [],
}
