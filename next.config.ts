
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! ADVERTENCIA !!
    // Ignorar errores de TypeScript durante el build de producción puede ocultar problemas.
    // Asegúrate de ejecutar `npm run typecheck` localmente antes de desplegar.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["6000-firebase-studio-1752214678917.cluster-c3a7z3wnwzapkx3rfr5kz62dac.cloudworkstations.dev"],
    },
  },
};

export default nextConfig;

    
