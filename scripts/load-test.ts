/**
 * ShopFlow - High-Concurrency Performance & Load Testing Tool (TASK-26.4)
 * File: scripts/load-test.ts
 *
 * Đo lường hiệu năng, thông lượng (RPS) và độ trễ p50/p95/p99 của API
 * trước và sau khi kích hoạt Redis Caching & HTTP Compression.
 *
 * Cách chạy:
 *   npx tsx scripts/load-test.ts [options]
 *
 * Ví dụ:
 *   npx tsx scripts/load-test.ts --url http://localhost:5000/health --requests 500 --concurrency 25
 */

interface LoadTestOptions {
  url: string;
  totalRequests: number;
  concurrency: number;
}

interface BenchmarkResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  rps: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export async function runLoadTest(options: LoadTestOptions): Promise<BenchmarkResult> {
  const { url, totalRequests, concurrency } = options;
  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  console.log(`\n======================================================`);
  console.log(`🚀 SHOPFLOW LOAD TESTING SUITE`);
  console.log(`🎯 Mục tiêu: ${url}`);
  console.log(`📦 Tổng số requests: ${totalRequests} | ⚡ Đồng thời: ${concurrency}`);
  console.log(`======================================================\n`);

  const startTime = Date.now();
  let remainingRequests = totalRequests;

  async function worker(): Promise<void> {
    while (true) {
      if (remainingRequests <= 0) {
        break;
      }
      remainingRequests--;

      const reqStart = Date.now();
      try {
        const response = await fetch(url, {
          headers: {
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': 'ShopFlow-LoadTester/1.0',
          },
        });

        const reqEnd = Date.now();
        const duration = reqEnd - reqStart;
        latencies.push(duration);

        if (response.ok) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch {
        const reqEnd = Date.now();
        latencies.push(reqEnd - reqStart);
        failedRequests++;
      }
    }
  }

  // Khởi động nhóm concurrent workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  const totalDurationMs = Date.now() - startTime;

  // Tính toán số liệu phân phối độ trễ
  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  const minLatency = latencies[0] ?? 0;
  const maxLatency = latencies[total - 1] ?? 0;
  const sumLatency = latencies.reduce((acc, curr) => acc + curr, 0);
  const avgLatency = total > 0 ? sumLatency / total : 0;

  const p50 = latencies[Math.floor(total * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(total * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(total * 0.99)] ?? 0;

  const rps = totalDurationMs > 0 ? Math.round((total / (totalDurationMs / 1000)) * 100) / 100 : 0;

  const result: BenchmarkResult = {
    totalRequests,
    successfulRequests,
    failedRequests,
    durationMs: totalDurationMs,
    rps,
    minLatencyMs: minLatency,
    maxLatencyMs: maxLatency,
    avgLatencyMs: Math.round(avgLatency * 100) / 100,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
  };

  printReport(result);
  return result;
}

function printReport(res: BenchmarkResult): void {
  console.log(`📊 KẾT QUẢ KIỂM THỬ TẢI CHI TIẾT:`);
  console.log(`------------------------------------------------------`);
  console.log(`⏱  Tổng thời gian chạy:   ${res.durationMs} ms`);
  console.log(`🚀 Thông lượng (Throughput): ${res.rps} Requests/giây (RPS)`);
  console.log(`✅ Thành công (2xx):        ${res.successfulRequests} / ${res.totalRequests}`);
  console.log(`❌ Thất bại:                 ${res.failedRequests}`);
  console.log(`------------------------------------------------------`);
  console.log(`📈 PHÂN PHỐI ĐỘ TRỄ (LATENCY):`);
  console.log(`   - Tối thiểu (Min):        ${res.minLatencyMs} ms`);
  console.log(`   - Trung bình (Avg):       ${res.avgLatencyMs} ms`);
  console.log(`   - p50 (Median):           ${res.p50Ms} ms`);
  console.log(`   - p95 (95th percentile):  ${res.p95Ms} ms`);
  console.log(`   - p99 (99th percentile):  ${res.p99Ms} ms`);
  console.log(`   - Tối đa (Max):           ${res.maxLatencyMs} ms`);
  console.log(`======================================================\n`);
}

// Chạy trực tiếp qua CLI
const args = process.argv.slice(2);
const targetUrl = args.find((a) => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:5000/health';
const requestsCount = parseInt(args.find((a) => a.startsWith('--requests='))?.split('=')[1] || '200', 10);
const concurrencyLevel = parseInt(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] || '10', 10);

if (process.argv[1]?.endsWith('load-test.ts')) {
  runLoadTest({
    url: targetUrl,
    totalRequests: requestsCount,
    concurrency: concurrencyLevel,
  }).catch((err) => {
    console.error('Lỗi khi chạy benchmark:', err);
  });
}
