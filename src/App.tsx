import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";

const hzToMs = (hz: number) => 1000 / hz;
const msToHz = (ms: number) => 1000 / ms;
const REFRESH_MIN = hzToMs(60);
const REFRESH_MAX = hzToMs(1);
const meanAverageReducer = (
  avg: number,
  diff: number,
  _: number,
  { length }: { length: number }
) => {
  return avg + diff / length;
};

export default function App() {
  // Background
  const [options] = useState(["black", "white"]);
  const [background, setBackground] = useState("black");
  const getOppositeBackground = useCallback(
    (bg) => (bg === options[0] ? options[1] : options[0]),
    [options]
  );
  const toggleBackground = useCallback(() => {
    setBackground((bg) => {
      return getOppositeBackground(bg);
    });
  }, [setBackground, getOppositeBackground]);

  // Player state
  const [playerState, setPlayerState] = useState<"play" | "pause">("pause");
  const getOppositePlayerState = useCallback(
    (playerState: string) => (playerState === "pause" ? "play" : "pause"),
    []
  );
  const togglePlayerState = useCallback(() => {
    setPlayerState((playerState) => {
      return getOppositePlayerState(playerState);
    });
  }, [setPlayerState, getOppositePlayerState]);

  // Screen refresh
  const [refreshMs, setRefreshMs] = useState(hzToMs(10));
  const lastPerformance = useRef(performance.now());
  const frameRequest = useRef<number>();
  const refreshScreen = useCallback(() => {
    if (playerState === "play") {
      if (performance.now() >= lastPerformance.current + refreshMs) {
        toggleBackground();
        lastPerformance.current = performance.now();
      }
    }
    frameRequest.current = requestAnimationFrame(refreshScreen);
  }, [playerState, refreshMs, toggleBackground]);
  useEffect(() => {
    frameRequest.current = requestAnimationFrame(refreshScreen);
    return () => cancelAnimationFrame(frameRequest.current!);
  }, [refreshScreen]);

  // Refresh history
  const refreshHistory = useRef([] as number[]);
  useEffect(() => {
    refreshHistory.current = [performance.now(), ...refreshHistory.current];
  }, [background]);
  useEffect(() => {
    refreshHistory.current = [];
  }, [refreshMs]);
  useEffect(() => {
    refreshHistory.current = [];
    if (playerState !== "play" && frameRequest.current) {
      cancelAnimationFrame(frameRequest.current);
    }
  }, [playerState]);
  const getAvgRefreshMs = () => {
    const history = refreshHistory.current.slice(1, 20);

    const diffArr = history.reduce((diffArr, older, i) => {
      const newer = history[i - 1];
      if (!newer || !older) return diffArr;
      const diff = newer - older;
      return [diff, ...diffArr];
    }, [] as number[]);

    return diffArr.reduce(meanAverageReducer, 0);
  };

  // Render
  return (
    <div
      style={{
        background,
        color: getOppositeBackground(background)
      }}
      className="w-screen h-screen fixed"
    >
      <div>Refresh time: {refreshMs} ms</div>
      <div className="text-4xl text-center px-6">
        <div>
          <b>{msToHz(refreshMs).toFixed(1)} Hz</b>
        </div>
        <div>Actual: {msToHz(getAvgRefreshMs()).toFixed(1)} Hz</div>
        <code>{JSON.stringify(refreshHistory.current)}</code>
        <input
          className="block w-full"
          type="range"
          min={REFRESH_MIN}
          max={REFRESH_MAX}
          value={refreshMs}
          onChange={(e) => {
            setRefreshMs(Number(e.target.value));
          }}
        />
        <button className="text-lg border-2 px-4" onClick={togglePlayerState}>
          {getOppositePlayerState(playerState)}
        </button>
      </div>
      <br />
      <ul>
        <li>Gamma (γ) &gt;35 Hz Concentration</li>

        <li>
          Beta (β) 12–35 Hz Anxiety dominant, active, external attention,
          relaxed
        </li>

        <li>Alpha (α) 8–12 Hz Very relaxed, passive attention</li>

        <li>Theta (θ) 4–8 Hz Deeply relaxed, inward focused</li>

        <li>Delta (δ) 0.5–4 Hz Sleep</li>
      </ul>
    </div>
  );
}
