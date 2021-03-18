import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";
import useLocalStorage from "@rehooks/local-storage";

const hzToMs = (hz: number) => 1000 / hz;
const msToHz = (ms: number) => 1000 / ms;
const REFRESH_MIN = hzToMs(50);
const REFRESH_MAX = hzToMs(4);
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
  const [playerState, setPlayerState] = useState<"start" | "stop">("stop");
  const getOppositePlayerState = useCallback(
    (playerState: string) => (playerState === "stop" ? "start" : "stop"),
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
    if (playerState === "start") {
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

  // Saved settings
  type Bookmark = {
    refreshMs: number;
    comment?: string;
    date: Date;
  };
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>(
    "janbaykara/flicker/bookmarks",
    []
  );
  const addBookmark = (comment: string) => {
    setBookmarks([
      ...bookmarks,
      {
        refreshMs,
        comment,
        date: new Date()
      }
    ]);
  };
  const deleteBookmark = (ms: number) => {
    setBookmarks(bookmarks.filter((b) => b.refreshMs !== ms));
  };

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
    if (playerState !== "start" && frameRequest.current) {
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
      className="w-screen h-screen fixed p-6 font-mono"
    >
      <div className="max-w-prose mx-auto">
        <div className={playerState === "start" ? "opacity-0" : ""}>
          <div className="text-left opacity-50">
            Pick a frequency. Click 'start'. (Optional: close your eyes.)
            <br />
            Use Safari for best results.
          </div>
        </div>
        <div className="text-2xl text-center">
          <div className="mb-2 text-right">
            goal: {msToHz(refreshMs).toFixed(1)} Hz
            <br />
            measured: <b>{msToHz(getAvgRefreshMs()).toFixed(1)}</b> Hz
          </div>
          {/* <code>{JSON.stringify(refreshHistory.current)}</code> */}
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
        </div>
        <div className="text-center">
          <button className="text-lg border-2 px-4" onClick={togglePlayerState}>
            {getOppositePlayerState(playerState)}
          </button>
        </div>
        <div
          className={`grid md:grid-cols-2 gap-6 my-4 ${
            playerState === "start" ? "opacity-0" : ""
          }`}
        >
          <div>
            {/* <h3 className="text-xl">Bookmark a frequency</h3> */}
            <AddBookmarkForm onSubmit={addBookmark} />
          </div>
          <div>
            <h3 className="text-xl">Bookmarked frequencies</h3>
            {bookmarks.map((b) => {
              return (
                <div
                  className="hover:text-red"
                  key={b.comment + "-" + b.refreshMs}
                >
                  <div className="text-xl">
                    {msToHz(b.refreshMs).toFixed(1)} Hz: {b.comment}
                  </div>
                  <div className="text-xs cursor-pointer">
                    <span
                      className="hover:opacity-50"
                      onClick={() => setRefreshMs(b.refreshMs)}
                    >
                      Select ✅
                    </span>
                    &nbsp;
                    <span
                      className="hover:opacity-50"
                      onClick={() => deleteBookmark(b.refreshMs)}
                    >
                      Delete ❌
                    </span>
                  </div>
                </div>
              );
            })}
            <ul className="mt-4 cursor-pointer text-sm">
              <h3 className="text-xl">Brain frequencies</h3>

              <li
                className="hover:opacity-50"
                onClick={() => setRefreshMs(hzToMs(40))}
              >
                Gamma (γ) &gt;35 Hz Concentration
              </li>

              <li
                className="hover:opacity-50"
                onClick={() => setRefreshMs(hzToMs(23))}
              >
                Beta (β) 12–35 Hz Anxiety dominant, active, external attention,
                relaxed
              </li>

              <li
                className="hover:opacity-50"
                onClick={() => setRefreshMs(hzToMs(10))}
              >
                Alpha (α) 8–12 Hz Very relaxed, passive attention
              </li>

              <li
                className="hover:opacity-50"
                onClick={() => setRefreshMs(hzToMs(6))}
              >
                Theta (θ) 4–8 Hz Deeply relaxed, inward focused
              </li>

              <li
                className="hover:opacity-50"
                onClick={() => setRefreshMs(hzToMs(2))}
              >
                Delta (δ) 0.5–4 Hz Sleep
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddBookmarkForm({ onSubmit }) {
  const [text, setText] = useState("");
  return (
    <form onSubmit={() => onSubmit(text)} className="space-y-3">
      <textarea
        placeholder="Describe what you see."
        className="p-2 text-black block w-full"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="border-2 px-4">
        Save bookmark
      </button>
    </form>
  );
}
