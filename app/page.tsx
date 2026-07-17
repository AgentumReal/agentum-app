import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/sections/hero";
import { LiveStats } from "@/components/sections/live-stats";
import { Categories } from "@/components/sections/categories";
import { Lifecycle } from "@/components/sections/lifecycle";
import { Fees } from "@/components/sections/fees";
import { Leaderboard } from "@/components/sections/leaderboard";
import { ClaimCta } from "@/components/sections/claim-cta";
import { getMarketStat, getLeaderboard } from "@/lib/data/market";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stat, leaders] = await Promise.all([getMarketStat(), getLeaderboard(5)]);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LiveStats stat={stat} />
        <Categories />
        <Lifecycle />
        <Fees />
        <Leaderboard rows={leaders} />
        <ClaimCta />
      </main>
      <Footer />
    </>
  );
}
