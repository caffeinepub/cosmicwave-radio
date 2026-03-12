import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Globe,
  Heart,
  Loader2,
  Pause,
  Play,
  Radio,
  Search,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Station } from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

// ── Types ────────────────────────────────────────────────────────────────────

interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  tags: string;
  favicon: string;
  codec: string;
}

interface RadioBrowserLanguage {
  name: string;
  stationcount: number;
}

interface RadioBrowserCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

type RadioStation = Station;

// ── Constants ─────────────────────────────────────────────────────────────────

const RADIO_BASE = "https://de1.api.radio-browser.info/json";

const GENRES: { label: string; tag: string; icon: string }[] = [
  { label: "Geopolitics", tag: "geopolitics", icon: "🌐" },
  { label: "Hinduism", tag: "hinduism", icon: "🕉️" },
  { label: "UFO & UAP", tag: "ufo", icon: "🛸" },
  { label: "Reincarnation", tag: "reincarnation", icon: "♾️" },
  { label: "Paranormal", tag: "paranormal", icon: "👁️" },
  { label: "Astrology", tag: "astrology", icon: "✨" },
  { label: "Sci-Fi", tag: "scifi", icon: "🚀" },
  { label: "Psychology", tag: "psychology", icon: "🧠" },
  { label: "Science", tag: "science", icon: "🔬" },
  { label: "AI & Technology", tag: "technology", icon: "🤖" },
];

const LS_KEY = "cosmicwave_favorites_v2";

const FEATURED_BROADCASTERS: RadioStation[] = [
  {
    id: "featured-bbc-world",
    name: "BBC World Service",
    streamUrl: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
    tags: "news,world,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-npr",
    name: "NPR News Now",
    streamUrl: "https://npr-ice.streamguys1.com/live.mp3",
    tags: "news,usa,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-dw",
    name: "Deutsche Welle English",
    streamUrl: "https://stream.dw.com/radio/rockradio/mp3-128",
    tags: "news,germany,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-rfi",
    name: "RFI English",
    streamUrl: "https://rfienglish.ice.infomaniak.ch/rfienglish-mp3-128.mp3",
    tags: "news,france,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-air",
    name: "All India Radio National",
    streamUrl:
      "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
    tags: "news,india",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-abc",
    name: "ABC News Radio Australia",
    streamUrl: "https://live-radio01.mediahubaustralia.com/2PBW/mp3/",
    tags: "news,australia,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-rci",
    name: "Radio Canada International",
    streamUrl: "https://ici-musique.cdn.radio.ca/rci/rci_96k.aac",
    tags: "news,canada,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-rnz",
    name: "Radio New Zealand",
    streamUrl: "https://radionz-ice.streamguys1.com/national.mp3",
    tags: "news,new zealand,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
  {
    id: "featured-voa",
    name: "Voice of America",
    streamUrl:
      "https://voa-inlang-1-lh.akamaihd.net/i/VOAEnglish_1@359718/index_48_a-p.m3u8",
    tags: "news,usa,english",
    favicon: "",
    genre: "Public Broadcasters",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapStation(s: RadioBrowserStation, genre: string): RadioStation {
  return {
    id: s.stationuuid,
    name: s.name,
    streamUrl: s.url_resolved,
    tags: s.tags || "",
    favicon: s.favicon || "",
    genre,
  };
}

async function fetchByTag(
  tag: string,
  limit = 2,
): Promise<RadioBrowserStation[]> {
  try {
    const res = await fetch(
      `${RADIO_BASE}/stations/bytag/${encodeURIComponent(tag)}?limit=${limit}&hidebroken=true&order=clickcount&reverse=true`,
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function searchByName(q: string): Promise<RadioBrowserStation[]> {
  try {
    const res = await fetch(
      `${RADIO_BASE}/stations/search?name=${encodeURIComponent(q)}&limit=20&hidebroken=true&order=clickcount&reverse=true`,
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function loadLocalFavs(): RadioStation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalFavs(favs: RadioStation[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(favs));
}

// ── QueryClient ───────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

// ── Root Export ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CosmicWaveRadio />
      <Toaster position="top-right" theme="dark" />
    </QueryClientProvider>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function CosmicWaveRadio() {
  const { login, clear, identity, loginStatus, isInitializing } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const isLoggedIn = !!identity;
  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal
    ? `${principal.slice(0, 6)}…${principal.slice(-4)}`
    : "";

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [volume, setVolume] = useState(0.75);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  // Favorites
  const [favorites, setFavorites] = useState<RadioStation[]>(loadLocalFavs);
  const [backendSynced, setBackendSynced] = useState(false);

  // ── Audio setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };
    const onCanPlay = () => setIsLoadingAudio(false);
    const onWaiting = () => setIsLoadingAudio(true);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
    };
  }, []);

  // ── Backend favorites sync ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn || !actor || actorFetching || backendSynced) return;
    actor
      .getFavorites()
      .then((backendFavs) => {
        const local = loadLocalFavs();
        const merged = [
          ...backendFavs,
          ...local.filter((l) => !backendFavs.some((b) => b.id === l.id)),
        ];
        setFavorites(merged);
        saveLocalFavs(merged);
        const toSync = local.filter(
          (l) => !backendFavs.some((b) => b.id === l.id),
        );
        if (toSync.length > 0) {
          Promise.all(toSync.map((s) => actor.addFavorite(s))).catch(() => {});
        }
        setBackendSynced(true);
      })
      .catch(() => {
        setBackendSynced(true);
      });
  }, [isLoggedIn, actor, actorFetching, backendSynced]);

  useEffect(() => {
    if (!isLoggedIn) setBackendSynced(false);
  }, [isLoggedIn]);

  // ── Play logic ─────────────────────────────────────────────────────────────

  const playStation = useCallback(
    async (station: RadioStation) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentStation?.id === station.id) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          setIsLoadingAudio(true);
          try {
            await audio.play();
            setIsPlaying(true);
          } catch {
            toast.error("Playback failed — stream may be unavailable.");
          } finally {
            setIsLoadingAudio(false);
          }
        }
        return;
      }

      setCurrentStation(station);
      setIsLoadingAudio(true);
      audio.src = station.streamUrl;
      audio.volume = volume;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        toast.error(
          "Unable to play this station. The stream may be HTTP-only or offline.",
        );
        setIsPlaying(false);
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [currentStation, isPlaying, volume],
  );

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentStation) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoadingAudio(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        toast.error("Playback failed.");
      } finally {
        setIsLoadingAudio(false);
      }
    }
  }, [isPlaying, currentStation]);

  // ── Favorites logic ────────────────────────────────────────────────────────

  const isFav = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggleFav = useCallback(
    async (station: RadioStation) => {
      const already = isFav(station.id);
      if (already) {
        const next = favorites.filter((f) => f.id !== station.id);
        setFavorites(next);
        saveLocalFavs(next);
        if (isLoggedIn && actor) {
          actor.removeFavorite(station.id).catch(() => {});
        }
        toast.success(`Removed "${station.name}" from favourites`);
      } else {
        const next = [...favorites, station];
        setFavorites(next);
        saveLocalFavs(next);
        if (isLoggedIn && actor) {
          actor.addFavorite(station).catch(() => {});
        }
        toast.success(`Added "${station.name}" to favourites`);
      }
    },
    [favorites, isFav, isLoggedIn, actor],
  );

  // ── Search query ───────────────────────────────────────────────────────────

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["search", activeQuery],
    queryFn: async () => {
      if (!activeQuery) return [];
      const res = await searchByName(activeQuery);
      return res.map((s) => mapStation(s, "Search"));
    },
    enabled: !!activeQuery,
    staleTime: 60_000,
  });

  // ── Genre stations ─────────────────────────────────────────────────────────

  const { data: genreData, isLoading: genresLoading } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const results = await Promise.all(
        GENRES.map(async ({ label, tag }) => {
          const stations = await fetchByTag(tag, 2);
          return {
            label,
            tag,
            stations: stations.map((s) => mapStation(s, label)),
          };
        }),
      );
      return results;
    },
    staleTime: 5 * 60_000,
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="crt-scanlines min-h-screen bg-background text-foreground font-body">
      {/* biome-ignore lint/a11y/useMediaCaption: live radio streams have no caption tracks */}
      <audio ref={audioRef} preload="none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Radio className="w-7 h-7 text-primary relative z-10" />
              <div className="absolute inset-0 blur-lg bg-primary/50 rounded-full" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black text-primary leading-none glow-text tracking-wide">
                CosmicWave
              </h1>
              <p className="text-[9px] tracking-[0.35em] uppercase text-muted-foreground font-mono">
                Radio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isInitializing ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {shortPrincipal}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clear}
                  data-ocid="header.logout_button"
                  className="border-border/60 text-foreground/70 hover:border-destructive/60 hover:text-destructive text-xs"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={login}
                disabled={loginStatus === "logging-in"}
                data-ocid="header.login_button"
                className="bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow-amber text-xs font-semibold"
              >
                {loginStatus === "logging-in" ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1.5" />
                    Sign In
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative w-full h-36 sm:h-48 overflow-hidden">
        <img
          src="/assets/generated/cosmicwave-hero.dim_1200x300.jpg"
          alt="CosmicWave Radio"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground/90 glow-text text-center px-4">
            The Universe Is Broadcasting
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground tracking-widest uppercase mt-1">
            Tune In · Explore · Transcend
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-36 pt-8">
        {/* ── Search ── */}
        <section className="mb-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchInput.trim()) setActiveQuery(searchInput.trim());
            }}
            className="flex gap-2 max-w-lg"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search any radio station worldwide…"
                className="pl-9 bg-card border-border/60 focus:border-primary/70 focus-visible:ring-primary/40 text-sm"
                data-ocid="search.search_input"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setActiveQuery("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              data-ocid="search.submit_button"
              className="bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow-amber"
            >
              Search
            </Button>
          </form>
        </section>

        {/* ── Search Results ── */}
        <AnimatePresence>
          {activeQuery && (
            <motion.section
              key="search-results"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-12"
            >
              <SectionHeader icon="📡" title={`Results: "${activeQuery}"`} />
              {isSearching ? (
                <SkeletonGrid count={4} />
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {searchResults.slice(0, 20).map((station, i) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isPlaying={currentStation?.id === station.id && isPlaying}
                      isFav={isFav(station.id)}
                      onPlay={() => playStation(station)}
                      onToggleFav={() => toggleFav(station)}
                      index={i + 1}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No stations found for &ldquo;{activeQuery}&rdquo; — try a
                  different keyword.
                </p>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Favourites ── */}
        <AnimatePresence>
          {favorites.length > 0 && (
            <motion.section
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-12"
              data-ocid="favorites.section"
            >
              <SectionHeader icon="❤️" title="Your Favourites" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {favorites.map((station, i) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isPlaying={currentStation?.id === station.id && isPlaying}
                    isFav={true}
                    onPlay={() => playStation(station)}
                    onToggleFav={() => toggleFav(station)}
                    index={i + 1}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {!isLoggedIn && favorites.length === 0 && (
          <div
            className="mb-8 flex items-center gap-3 p-3 rounded-sm border border-primary/15 bg-primary/5 text-xs text-muted-foreground"
            data-ocid="favorites.empty_state"
          >
            <Heart className="w-4 h-4 text-primary/50 flex-shrink-0" />
            <span>
              Sign in to sync your favourites across devices. For now, they save
              locally in your browser.
            </span>
          </div>
        )}

        {/* ── Main Tabs: Genres / Browse ── */}
        <Tabs defaultValue="genres" className="w-full">
          <TabsList className="w-full sm:w-auto mb-8 h-11 bg-card border border-border/50 rounded-sm p-1 grid grid-cols-2 sm:inline-flex">
            <TabsTrigger
              value="genres"
              data-ocid="genres.tab"
              className="text-sm font-semibold flex-1 sm:flex-none px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm transition-all"
            >
              🎙️ Genres
            </TabsTrigger>
            <TabsTrigger
              value="browse"
              data-ocid="browse.tab"
              className="text-sm font-semibold flex-1 sm:flex-none px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm transition-all"
            >
              🌍 Browse
            </TabsTrigger>
          </TabsList>

          {/* ── Genres Tab ── */}
          <TabsContent value="genres" className="mt-0">
            {genresLoading ? (
              <div className="space-y-10">
                {GENRES.map((g) => (
                  <div key={g.tag}>
                    <div className="h-7 w-48 bg-muted/50 rounded-sm mb-4 animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="h-28 bg-card/80 rounded-sm animate-pulse" />
                      <div className="h-28 bg-card/80 rounded-sm animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              genreData?.map((genre, i) => (
                <GenreSection
                  key={genre.tag}
                  label={genre.label}
                  icon={GENRES[i].icon}
                  stations={genre.stations}
                  sectionIndex={i + 1}
                  currentStationId={currentStation?.id}
                  isPlaying={isPlaying}
                  favorites={favorites}
                  onPlay={playStation}
                  onToggleFav={toggleFav}
                />
              ))
            )}
          </TabsContent>

          {/* ── Browse Tab ── */}
          <TabsContent value="browse" className="mt-0">
            <BrowseTab
              currentStationId={currentStation?.id}
              isPlaying={isPlaying}
              favorites={favorites}
              onPlay={playStation}
              onToggleFav={toggleFav}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-3 text-xs text-muted-foreground/40 pb-28">
        © {new Date().getFullYear()}. Built with ♥ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          caffeine.ai
        </a>
      </footer>

      {/* ── Persistent Player ── */}
      <PlayerBar
        station={currentStation}
        isPlaying={isPlaying}
        isLoading={isLoadingAudio}
        volume={volume}
        onTogglePlay={togglePlayPause}
        onVolumeChange={setVolume}
      />
    </div>
  );
}

// ── BrowseTab ─────────────────────────────────────────────────────────────────

interface BrowseTabProps {
  currentStationId?: string;
  isPlaying: boolean;
  favorites: RadioStation[];
  onPlay: (s: RadioStation) => void;
  onToggleFav: (s: RadioStation) => void;
}

function BrowseTab({
  currentStationId,
  isPlaying,
  favorites,
  onPlay,
  onToggleFav,
}: BrowseTabProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const isFav = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  // Fetch available languages
  const { data: languages } = useQuery<RadioBrowserLanguage[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      const res = await fetch(
        `${RADIO_BASE}/languages?order=name&reverse=false`,
      );
      if (!res.ok) return [];
      const data: RadioBrowserLanguage[] = await res.json();
      return data.filter((l) => l.name && l.stationcount > 0);
    },
    staleTime: 30 * 60_000,
  });

  // Fetch available countries
  const { data: countries } = useQuery<RadioBrowserCountry[]>({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch(
        `${RADIO_BASE}/countries?order=name&reverse=false`,
      );
      if (!res.ok) return [];
      const data: RadioBrowserCountry[] = await res.json();
      return data.filter((c) => c.name && c.stationcount > 0);
    },
    staleTime: 30 * 60_000,
  });

  // Fetch filtered stations when language or country is selected
  const hasFilter = !!selectedLanguage || !!selectedCountry;
  const {
    data: filteredStations,
    isFetching: filterFetching,
    isError: filterError,
  } = useQuery<RadioStation[]>({
    queryKey: ["browse-stations", selectedLanguage, selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
        hidebroken: "true",
        order: "clickcount",
        reverse: "true",
      });
      if (selectedLanguage) params.set("language", selectedLanguage);
      if (selectedCountry) params.set("countrycode", selectedCountry);
      const res = await fetch(
        `${RADIO_BASE}/stations/search?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch stations");
      const data: RadioBrowserStation[] = await res.json();
      return data.map((s) =>
        mapStation(s, selectedLanguage || selectedCountry || "Browse"),
      );
    },
    enabled: hasFilter,
    staleTime: 60_000,
  });

  const handleClear = () => {
    setSelectedLanguage("");
    setSelectedCountry("");
  };

  return (
    <div className="space-y-12">
      {/* ── Language & Country Filters ── */}
      <section>
        <SectionHeader icon="🔎" title="Filter by Language & Region" />
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-2">
              Language
            </p>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger
                data-ocid="browse.language_select"
                className="bg-card border-border/60 focus:border-primary/70 h-11 text-sm"
              >
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {languages?.map((lang) => (
                  <SelectItem key={lang.name} value={lang.name}>
                    {lang.name.charAt(0).toUpperCase() + lang.name.slice(1)}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({lang.stationcount.toLocaleString()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-2">
              Country / Region
            </p>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger
                data-ocid="browse.country_select"
                className="bg-card border-border/60 focus:border-primary/70 h-11 text-sm"
              >
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {countries?.map((c) => (
                  <SelectItem key={c.iso_3166_1 || c.name} value={c.iso_3166_1}>
                    {c.name}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({c.stationcount.toLocaleString()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilter && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleClear}
                data-ocid="browse.clear_button"
                className="h-11 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/50 text-sm w-full md:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Filter Results */}
        {hasFilter && (
          <AnimatePresence mode="wait">
            {filterFetching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                data-ocid="browse.results_loading_state"
              >
                <SkeletonGrid count={8} />
              </motion.div>
            ) : filterError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 rounded-sm border border-destructive/30 bg-destructive/5 text-sm text-destructive"
              >
                <X className="w-4 h-4 flex-shrink-0" />
                Failed to load stations. Please try again.
              </motion.div>
            ) : filteredStations && filteredStations.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                  {filteredStations.length} station
                  {filteredStations.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {filteredStations.map((station, i) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isPlaying={currentStationId === station.id && isPlaying}
                      isFav={isFav(station.id)}
                      onPlay={() => onPlay(station)}
                      onToggleFav={() => onToggleFav(station)}
                      index={i + 1}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 rounded-sm border border-dashed border-border/40 text-sm text-muted-foreground"
                data-ocid="browse.results_empty_state"
              >
                <Radio className="w-4 h-4 flex-shrink-0 opacity-40" />
                No stations found for this combination — try different filters.
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!hasFilter && (
          <div className="flex items-center gap-3 p-4 rounded-sm border border-dashed border-border/30 text-sm text-muted-foreground">
            <Globe className="w-4 h-4 flex-shrink-0 opacity-40" />
            Select a language or country above to discover stations worldwide.
          </div>
        )}
      </section>

      {/* ── Featured Public Broadcasters ── */}
      <section data-ocid="browse.featured_section">
        <SectionHeader icon="🌍" title="Featured Public Broadcasters" />
        <p className="text-xs text-muted-foreground mb-5 -mt-2">
          Hand-picked streams from the world&apos;s leading public radio
          networks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURED_BROADCASTERS.map((station, i) => (
            <StationCard
              key={station.id}
              station={station}
              isPlaying={currentStationId === station.id && isPlaying}
              isFav={isFav(station.id)}
              onPlay={() => onPlay(station)}
              onToggleFav={() => onToggleFav(station)}
              index={i + 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── StationCard ───────────────────────────────────────────────────────────────

interface StationCardProps {
  station: RadioStation;
  isPlaying: boolean;
  isFav: boolean;
  onPlay: () => void;
  onToggleFav: () => void;
  index: number;
}

function StationCard({
  station,
  isPlaying,
  isFav,
  onPlay,
  onToggleFav,
  index,
}: StationCardProps) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className={`station-card-hover relative rounded-sm border bg-card p-3 flex flex-col gap-3 ${
        isPlaying ? "playing-card" : "border-border/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/30">
          {station.favicon && !imgErr ? (
            <img
              src={station.favicon}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <Radio className="w-5 h-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {station.name || "Unknown Station"}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {station.tags?.split(",").slice(0, 2).join(" · ") ||
              station.genre ||
              "Radio"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPlay}
          data-ocid={`station.play_button.${index}`}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm font-medium transition-all ${
            isPlaying
              ? "bg-primary text-primary-foreground shadow-glow-amber"
              : "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-glow-amber"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3 h-3" /> Playing
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Play
            </>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          data-ocid={`station.toggle.${index}`}
          className={`p-1.5 rounded-sm transition-colors ${
            isFav
              ? "text-red-400"
              : "text-muted-foreground/50 hover:text-red-400"
          }`}
          aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>

      {isPlaying && (
        <Badge
          variant="outline"
          className="absolute top-2 right-2 text-[9px] px-1.5 py-0 border-primary/40 text-primary/80 font-mono"
        >
          LIVE
        </Badge>
      )}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      <h2 className="font-display text-xl font-bold text-foreground">
        {title}
      </h2>
      <div className="genre-divider flex-1" />
    </div>
  );
}

// ── GenreSection ──────────────────────────────────────────────────────────────

interface GenreSectionProps {
  label: string;
  icon: string;
  stations: RadioStation[];
  sectionIndex: number;
  currentStationId?: string;
  isPlaying: boolean;
  favorites: RadioStation[];
  onPlay: (s: RadioStation) => void;
  onToggleFav: (s: RadioStation) => void;
}

function GenreSection({
  label,
  icon,
  stations,
  sectionIndex,
  currentStationId,
  isPlaying,
  favorites,
  onPlay,
  onToggleFav,
}: GenreSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-10"
      data-ocid={`genre.section.${sectionIndex}`}
    >
      <SectionHeader icon={icon} title={label} />

      {stations.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-sm border border-dashed border-border/40 text-sm text-muted-foreground">
          <Radio className="w-4 h-4 flex-shrink-0 opacity-40" />
          <span>
            No stations found for this topic — try searching for &ldquo;
            {label.toLowerCase()}&rdquo; above.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stations.map((station, i) => (
            <StationCard
              key={station.id}
              station={station}
              isPlaying={currentStationId === station.id && isPlaying}
              isFav={favorites.some((f) => f.id === station.id)}
              onPlay={() => onPlay(station)}
              onToggleFav={() => onToggleFav(station)}
              index={(sectionIndex - 1) * 2 + i + 1}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}

// ── SkeletonGrid ──────────────────────────────────────────────────────────────

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          key={`skeleton-${i}`}
          className="h-28 bg-card/80 rounded-sm border border-border/30 animate-pulse"
        />
      ))}
    </div>
  );
}

// ── PlayerBar ────────────────────────────────────────────────────────────────

interface PlayerBarProps {
  station: RadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  onTogglePlay: () => void;
  onVolumeChange: (v: number) => void;
}

function PlayerBar({
  station,
  isPlaying,
  isLoading,
  volume,
  onTogglePlay,
  onVolumeChange,
}: PlayerBarProps) {
  const [imgErr, setImgErr] = useState(false);

  const stationId = station?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset img error when station changes
  useEffect(() => setImgErr(false), [stationId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/98 backdrop-blur-xl">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-sm bg-muted border border-border/40 flex items-center justify-center overflow-hidden flex-shrink-0">
            {station?.favicon && !imgErr ? (
              <img
                src={station.favicon}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgErr(true)}
              />
            ) : (
              <Radio
                className={`w-5 h-5 ${
                  station ? "text-primary" : "text-muted-foreground/40"
                }`}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {station ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {station.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {station.genre}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground/60">
                Select a station to start listening
              </p>
            )}
          </div>

          {isPlaying && (
            <div className="hidden sm:flex gap-0.5 items-end h-5 flex-shrink-0">
              {[0.4, 0.7, 1.0, 0.6, 0.85].map((h, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static visualizer bars
                  key={`bar-${i}`}
                  className="w-1 bg-primary rounded-full bounce-bar"
                  style={{
                    height: `${h * 20}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!station}
          data-ocid="player.toggle"
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            station
              ? "bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow-amber"
              : "bg-muted text-muted-foreground/40 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <div className="hidden sm:flex items-center gap-2 w-32">
          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([v]) => onVolumeChange(v)}
            data-ocid="player.volume_input"
            className="flex-1 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
          />
        </div>
      </div>
    </div>
  );
}
