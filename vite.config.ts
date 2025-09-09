import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
    plugins: [preact()],
    build: {
        lib: {
            entry: 'src/main.js',
            name: 'olrm',
            fileName: (format) => `olrm.${format}.js`,
            cssFileName: 'olrm'
        },
        rollupOptions: {
            external: ['ol'],
            output: {
                globals: {
                    ol: 'ol'
                }
            }
        },
        sourcemap: true,        
    }
});
