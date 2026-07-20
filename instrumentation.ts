/**
 * 服务启动时拉起 indexer 轮询(仅 nodejs runtime)。
 * Railway 常驻容器,setInterval 会一直跑,每 30s 一 tick,分批追上链上。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.INDEXER_DISABLED === "1") return;

  const { runIndexerTick } = await import("./lib/indexer");
  const tick = async () => {
    try {
      await runIndexerTick();
    } catch {
      /* 静默:tick 内部已 catch */
    }
  };
  setTimeout(tick, 6000); // 启动 6s 后先跑一次
  setInterval(tick, 30_000); // 之后每 30s
}
