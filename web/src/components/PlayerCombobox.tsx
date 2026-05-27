"use client";

// PlayerCombobox: タイトル予想用の選手名 input。
// - チーム選択時 props.team で絞り込み
// - 入力 1 文字以上で /api/players?team=&q= サジェスト取得 (debounce 200ms)
// - ↑↓ Enter で選択、Esc で閉じる
// - チーム未選択時は最初 入力なしで全選手 (limit 20) を直近候補として表示
// - a11y: role="combobox" + aria-expanded + aria-controls
// 自前実装 (依存追加なし、DnD と同じ軽量方針)
import { useEffect, useId, useRef, useState } from "react";

export interface Player {
  id: number;
  name: string;
  nameKana: string | null;
  teamName: string;
  position: string | null;
  uniformNumber: string | null;
}

export function PlayerCombobox({
  value,
  team,
  onChange,
  placeholder = "選手名を入力",
}: {
  value: string;
  team?: string;
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (team) params.set("team", team);
        if (value) params.set("q", value);
        params.set("limit", "20");
        const res = await fetch(`/api/players?${params.toString()}`);
        if (!res.ok) {
          setItems([]);
        } else {
          const data = (await res.json()) as { players: Player[] };
          setItems(data.players ?? []);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [open, value, team]);

  function handleSelect(p: Player) {
    onChange(p.name);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0 && items[activeIdx]) {
      e.preventDefault();
      handleSelect(items[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Allow click on list items to fire before closing
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-xs text-gray-400">読み込み中...</li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-400">
              候補なし
              {team ? "" : " (チーム未選択)"}
            </li>
          )}
          {items.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="font-medium text-gray-900">{p.name}</span>
              <span className="ml-3 text-xs text-gray-500">
                {p.uniformNumber ? `#${p.uniformNumber} ` : ""}
                {p.position ?? ""}
                {!team ? ` · ${p.teamName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
