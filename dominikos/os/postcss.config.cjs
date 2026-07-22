const path = require('path');

module.exports = {
  plugins: {
    // explicit path — PostCSS's cwd inside Vite doesn't always match the project root,
    // which makes Tailwind "miss" the config and warn about empty content sources
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.cjs') },
    autoprefixer: {},
  },
};
