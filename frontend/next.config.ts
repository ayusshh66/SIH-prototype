import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
