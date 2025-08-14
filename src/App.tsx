import { useEffect, useMemo, useRef, useState } from "react";

// === Utility Types ===
type FrameStyle = "neo" | "classic" | "dark" | "holo";

const CANVAS_W = 720; // px
const CANVAS_H = 1136; // px (phone-like portrait)

// default race list (自由記述も可)
const DEFAULT_RACES = [
  "魔族",
  "人間",
  "獣",
  "機械",
  "不死",
  "精霊",
  "龍",
  "天使",
  "悪魔",
];

// default transparent illustration (checkerboard)
function makeCheckerDataURL(size = 32) {
  const c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d9d9d9";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#f0f0f0";
  g.fillRect(0, 0, size, size);
  g.fillRect(size, size, size, size);
  return c.toDataURL();
}

function useImage(src?: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setImg(im);
    im.src = src;
    return () => {
      // cleanup reference
      setImg(null);
    };
  }, [src]);
  return img;
}

function drawFrame(ctx: CanvasRenderingContext2D, style: FrameStyle) {
  // Outer safe area shadow
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background gradient by frame style
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  if (style === "neo") {
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#020617");
  } else if (style === "classic") {
    bg.addColorStop(0, "#3b2f2f");
    bg.addColorStop(1, "#1f1b16");
  } else if (style === "dark") {
    bg.addColorStop(0, "#111827");
    bg.addColorStop(1, "#000000");
  } else {
    // holo
    bg.addColorStop(0, "#0c1027");
    bg.addColorStop(1, "#1a365d");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Inner rounded frame
  const pad = 18;
  const r = 28;
  ctx.fillStyle = style === "classic" ? "#9a6b3d" : style === "dark" ? "#2f2f2f" : "#1f2937";
  roundRect(ctx, pad, pad, CANVAS_W - pad * 2, CANVAS_H - pad * 2, r, true, false);

  // Metallic border
  const grd = ctx.createLinearGradient(0, pad, 0, CANVAS_H - pad);
  if (style === "classic") {
    grd.addColorStop(0, "#ffe1ad");
    grd.addColorStop(1, "#8b5a2b");
  } else if (style === "dark") {
    grd.addColorStop(0, "#9ca3af");
    grd.addColorStop(1, "#111827");
  } else if (style === "neo") {
    grd.addColorStop(0, "#67e8f9");
    grd.addColorStop(1, "#0ea5e9");
  } else {
    grd.addColorStop(0, "#a78bfa");
    grd.addColorStop(1, "#22d3ee");
  }
  ctx.lineWidth = 8;
  ctx.strokeStyle = grd;
  roundRect(ctx, pad + 6, pad + 6, CANVAS_W - (pad + 6) * 2, CANVAS_H - (pad + 6) * 2, r - 8, false, true);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean
) {
  const min = Math.min(w, h);
  if (r > min / 2) r = min / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function fitContain(srcW: number, srcH: number, dstW: number, dstH: number) {
  const ratio = Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * ratio;
  const h = srcH * ratio;
  return { w, h, x: (dstW - w) / 2, y: (dstH - h) / 2 };
}

function DividerLabel({ text }: { text: string }) {
  return (
    <div className="text-xs uppercase tracking-widest text-slate-400 select-none">{text}</div>
  );
}

export default function App() {
  const [frame, setFrame] = useState<FrameStyle>("neo");
  const [classCount, setClassCount] = useState(1); // 1..4

  const [title, setTitle] = useState("魔王スミノフ"); // 称号
  const [username, setUsername] = useState("");
  const [monsterName, setMonsterName] = useState("");
  const [exName, setExName] = useState("");
  const [battleMeme, setBattleMeme] = useState("");

  const [racePreset, setRacePreset] = useState(DEFAULT_RACES[0]);
  const [raceCustom, setRaceCustom] = useState("");

  const [techniques, setTechniques] = useState<string[]>(Array(24).fill("")); // 4*6

  const [useDefaultIllust, setUseDefaultIllust] = useState(true);
  const [uploadURL, setUploadURL] = useState<string | null>(null);
  const [checker, setChecker] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // generate a checkerboard placeholder at mount
    setChecker(makeCheckerDataURL());
  }, []);

  const illustSrc = useMemo(() => {
    if (useDefaultIllust) return checker;
    return uploadURL || checker;
  }, [useDefaultIllust, uploadURL, checker]);

  const illustImg = useImage(illustSrc || undefined);

  // redraw every time dependencies change
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // 1) draw frame
    drawFrame(ctx, frame);

    // 2) illustration area
    const illPad = 48;
    const illX = illPad;
    const illY = 180;
    const illW = CANVAS_W - illPad * 2;
    const illH = 580;

    // draw illustration container
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, illX, illY, illW, illH, 24, true, false);

    if (illustImg) {
      // fit contain and center
      const fit = fitContain(illustImg.width, illustImg.height, illW, illH);
      ctx.drawImage(illustImg, illX + fit.x, illY + fit.y, fit.w, fit.h);
    } else {
      // placeholder text
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "24px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textAlign = "center";
      ctx.fillText("Illustration", illX + illW / 2, illY + illH / 2);
    }
    ctx.restore();

    // 3) header title strip (上の欄：称号・ユーザー名（小）＋モンスター名（大）)
    ctx.save();
    const headerH = 132;
    const headerX = 32;
    const headerY = 64;
    const headerW = CANVAS_W - headerX * 2;

    const grad = ctx.createLinearGradient(headerX, headerY, headerX, headerY + headerH);
    grad.addColorStop(0, "#111827");
    grad.addColorStop(1, "#0b1220");
    ctx.fillStyle = grad;
    roundRect(ctx, headerX, headerY, headerW, headerH, 16, true, false);

    // 種族タグの描画幅を予約（右側に配置）
    const raceText = (raceCustom || racePreset || "").slice(0, 6);
    let reservedRight = 0;
    const tagMarginRight = 40; // 枠との余白
    let tagW = 0;
    let tagH = 0;
    if (raceText) {
      tagW = 64;
      tagH = headerH - 16;
      reservedRight = tagW + tagMarginRight + 8; // ユーザー名との間隔
    }

    // 1行目：称号（左寄せ小さめ）＋ ユーザー名（右寄せ小さめ）
    ctx.fillStyle = "#e5e7eb";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, Roboto"; // 少し小さい

    // 称号（左）
    ctx.textAlign = "left";
    ctx.fillText(title || "", headerX + 16, headerY + 34);

    // ユーザー名（右）— 種族タグの分だけ右側を空ける
    ctx.textAlign = "right";
    ctx.fillText(username || "", headerX + headerW - 16 - reservedRight, headerY + 34);

    // 2行目：モンスター名（中央・大）
    ctx.textAlign = "center";
    ctx.font = "bold 40px system-ui, -apple-system, Segoe UI, Roboto"; // 大きめ
    ctx.fillText(monsterName || "", headerX + headerW / 2, headerY + headerH / 2 + 22);

    // 種族タグ（右）
    if (raceText) {
      ctx.fillStyle = "#ef4444";
      roundRect(ctx, CANVAS_W - tagW - tagMarginRight, headerY + 8, tagW, tagH, 8, true, false);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(raceText, CANVAS_W - tagW / 2 - tagMarginRight, headerY + headerH / 2);
    }
    ctx.restore();

    // 4) Info labels (EX / Battle Meme のみ。称号・ユーザー名・モンスター名は上の欄に集約)
    ctx.save();
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "20px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const baseX = 48;
    let y = illY + illH + 36;
    const line = 26;

    if (exName) {
      ctx.fillText(`EX: ${exName}`, baseX, y);
      y += line;
    }
    if (battleMeme) {
      ctx.fillText(`Battle Meme: ${battleMeme}`, baseX, y);
      y += line;
    }

    ctx.restore();

    // 5) Techniques grid: classCount columns x 6 rows
    const cols = classCount;
    const rows = 6;
    const gridW = CANVAS_W - 96;
    const gridH = 240;
    const gx = 48;
    const gy = CANVAS_H - gridH - 64;
    const cellW = gridW / cols;
    const cellH = gridH / rows;

    ctx.save();
    // background panel
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#1f2937";
    roundRect(ctx, gx - 8, gy - 8, gridW + 16, gridH + 16, 12, true, false);
    ctx.globalAlpha = 1;

    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const index = c * rows + r; // 0..23
        const x = gx + c * cellW;
        const y2 = gy + r * cellH;
        // cell
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y2, cellW, cellH);
        // text
        ctx.fillStyle = "#e5e7eb";
        const t = (techniques[index] || "").slice(0, 18);
        ctx.fillText(t, x + 8, y2 + cellH / 2);
      }
    }

    ctx.restore();
  }, [frame, classCount, title, username, monsterName, exName, battleMeme, racePreset, raceCustom, illustImg, techniques]);

  function handleUpload(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadURL(String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleTechniqueChange(index: number, value: string) {
    setTechniques((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleDownload() {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "card"}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">カード画像ジェネレーター</h1>
          <p className="text-sm text-slate-400">要件に基づく最小実装。各入力を変更すると右のCanvasプレビューが即時更新されます。</p>

          <section className="space-y-3">
            <DividerLabel text="フレーム" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["neo", "classic", "dark", "holo"] as FrameStyle[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrame(f)}
                  className={`px-3 py-2 rounded-2xl border text-sm hover:opacity-90 ${
                    frame === f ? "border-cyan-400" : "border-slate-600"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <DividerLabel text="クラス数 (1〜4)" />
            <input
              type="range"
              min={1}
              max={4}
              value={classCount}
              onChange={(e) => setClassCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm">現在: <span className="font-semibold">{classCount}</span> クラス（技枠 {classCount * 6}）</div>
          </section>

          <section className="space-y-3">
            <DividerLabel text="カードイラスト" />
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="ill"
                  checked={useDefaultIllust}
                  onChange={() => setUseDefaultIllust(true)}
                />
                <span className="text-sm">デフォルト（透過風チェック）</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="ill"
                  checked={!useDefaultIllust}
                  onChange={() => setUseDefaultIllust(false)}
                />
                <span className="text-sm">アップロード</span>
              </label>
            </div>
            {!useDefaultIllust && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="block w-full text-sm"
              />
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <DividerLabel text="称号 (タイトル)" />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 魔王スミノフ"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <DividerLabel text="ユーザー名" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="プレイヤー名"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <DividerLabel text="モンスター名" />
              <input
                value={monsterName}
                onChange={(e) => setMonsterName(e.target.value)}
                placeholder="モンスター名"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <DividerLabel text="EX技名" />
              <input
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                placeholder="EX技名"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <DividerLabel text="バトルミーム名" />
              <input
                value={battleMeme}
                onChange={(e) => setBattleMeme(e.target.value)}
                placeholder="バトルミーム名"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <DividerLabel text="種族 (プリセット)" />
              <select
                value={racePreset}
                onChange={(e) => setRacePreset(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              >
                {DEFAULT_RACES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <DividerLabel text="種族 (自由記述・上書き)" />
              <input
                value={raceCustom}
                onChange={(e) => setRaceCustom(e.target.value)}
                placeholder="自由記述 (未入力ならプリセット表示)"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700"
              />
            </div>
          </section>

          <section className="space-y-3">
            <DividerLabel text="技名 (6×クラス数)" />
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${classCount}, minmax(0, 1fr))` }}>
              {Array.from({ length: classCount }).map((_, c) => (
                <div key={c} className="rounded-2xl border border-slate-700 p-3 bg-slate-900/40">
                  <div className="text-sm mb-2 opacity-80">クラス {c + 1}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {Array.from({ length: 6 }).map((__, r) => {
                      const idx = c * 6 + r;
                      return (
                        <input
                          key={idx}
                          value={techniques[idx] || ""}
                          onChange={(e) => handleTechniqueChange(idx, e.target.value)}
                          placeholder={`技 ${r + 1}`}
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm"
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 font-semibold"
            >
              PNGをダウンロード
            </button>
            <button
              onClick={() => {
                setTitle("");
                setUsername("");
                setMonsterName("");
                setExName("");
                setBattleMeme("");
                setRacePreset(DEFAULT_RACES[0]);
                setRaceCustom("");
                setTechniques(Array(24).fill(""));
                setUseDefaultIllust(true);
                setUploadURL(null);
              }}
              className="px-4 py-2 rounded-2xl bg-slate-800 border border-slate-600 hover:bg-slate-700"
            >
              リセット
            </button>
          </div>
        </div>

        {/* Right: Canvas Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-slate-400">リアルタイム・プレビュー（HTML &lt;canvas&gt; 使用）</div>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full max-w-xl rounded-3xl shadow-2xl border border-slate-800 bg-black"
          />
          <div className="text-xs text-slate-500">{CANVAS_W}×{CANVAS_H}px</div>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500">
        仕様は今後拡張可能：枠スキン追加、フォント差し替え、レア度表示、アイコン、数値等。
      </footer>
    </div>
  );
}
