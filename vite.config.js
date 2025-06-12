import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // La carpeta de salida donde Vite pondrá los ficheros compilados.
    // La llamamos 'dist' por convención.
    outDir: 'dist',
    
    // Opciones para Rollup, el "empaquetador" que usa Vite por debajo.
    rollupOptions: {
      // Definimos las "entradas" de nuestra extensión. Vite creará un fichero por cada una.
      input: {
        main: resolve(__dirname, 'src/main.js'),
        background: resolve(__dirname, 'src/background.js'),
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        // [name] será reemplazado por el nombre de la entrada (e.g., 'main', 'background').
        // Nos aseguramos de que los ficheros de salida no tengan un hash aleatorio en el nombre,
        // ya que necesitamos nombres fijos para referenciarlos en el manifest.json.
        entryFileNames: '[name].js',
        
        // Lo mismo para otros "chunks" de código que Vite pueda crear.
        chunkFileNames: 'chunks/[name].js',
        
        // Y para otros assets como el CSS.
        assetFileNames: (assetInfo) => {
          // Queremos que el CSS principal se llame styles.css
          if (assetInfo.name === 'main.css') {
            return 'styles.css';
          }
           return 'assets/[name].[ext]';
        },
      },
    },
    // Desactivamos la minificación para que sea más fácil depurar durante el desarrollo.
    // Para la versión final que subas a la tienda, puedes cambiarlo a 'esbuild' o 'terser'.
    //minify: 'esbuild', 
    minify: 'esbuild', 
  },
});