/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    config.plugins.push(
      new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] })
    )
    return config
  },
}

export default nextConfig
