// module.exports = {
//   content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
//   theme: {
//     extend: {
// colors: {
//   "brand-blue": "#1E40AF",
//   "brand-red": "#9F1239",
//   "brand-amber": "#B45309",
// },
//     },
//   },
//   plugins: [],
// };

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#1E40AF",
        "brand-red": "#9F1239",
        "brand-amber": "#B45309",
      },
    },
  },
  plugins: [],
};
