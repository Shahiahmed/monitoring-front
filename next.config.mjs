/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Папки с index.html (например /servers/) — так Spring Boot корректно отдаёт статику
  trailingSlash: true,
};

export default nextConfig;

