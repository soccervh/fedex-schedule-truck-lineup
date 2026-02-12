/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-fo',
    'bg-doc',
    'bg-unload',
    'bg-puller',
    'bg-swing',
    'bg-coverage',
  ],
  theme: {
    extend: {
      colors: {
        fo: '#3B82F6',        // blue-500 - FO driver
        doc: '#F97316',       // orange-500 - Doc worker
        unload: '#22C55E',    // green-500 - Unload worker
        puller: '#EAB308',    // yellow-500 - Puller
        swing: '#6B7280',     // gray-500 - Swing driver
        coverage: '#EF4444',  // red-500 - Needs coverage
      },
    },
  },
  plugins: [],
}
