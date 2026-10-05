import config from '../vite.config.ts';
export default (environment) => ({
  ...config(environment),
  server: { host: '127.0.0.1', port: 8795, strictPort: true, proxy: {
    '/api': { target: 'https://alivia.lat', changeOrigin: true, secure: true },
  } },
});
