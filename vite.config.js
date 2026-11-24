import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __BUILD_NUMBER__: JSON.stringify(process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 'local'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  }
})
