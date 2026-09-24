// /**
//  * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
//  * for Docker builds.
//  */
// import "./src/env.js";

// /** @type {import("next").NextConfig} */
// const config = {};

// export default config;

// next.config.mjs (ESM style)
// import path from 'path';

// next.config.mjs
// import path from 'path';

// export default {
//   experimental: {
//     turbopack: false,  // ← yeh add kar ke Turbopack band kar de abhi
//   },
// };




// next.config.mjs (ESM style – sahi syntax)
import path from 'path';

export default {
  // Turbopack ko band karne ke liye yeh sahi tareeka hai
  experimental: {
    turbopack: false,
  },

  // Root fix agar future me Turbopack on karna ho
  turbopack: {
    root: path.join(path.dirname(new URL(import.meta.url).pathname), '..'),
  },
};