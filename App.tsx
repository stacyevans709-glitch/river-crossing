import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Location = "left" | "raft" | "right";
type RaftPosition = "left" | "right";

interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  isDriver: boolean;
  location: Location;
}

interface GameState {
  characters: Character[];
  raftPosition: RaftPosition;
  moveCount: number;
  gameOver: boolean;
  gameWon: boolean;
  message: string;
  messageType: "info" | "error" | "success" | "warning";
  history: { characters: Character[]; raftPosition: RaftPosition; moveCount: number }[];
}

// --- Initial Characters ---
const createInitialCharacters = (): Character[] => [
  { id: "father", name: "Father", emoji: "👨", color: "#2563eb", bgColor: "#dbeafe", isDriver: true, location: "left" },
  { id: "mother", name: "Mother", emoji: "👩", color: "#db2777", bgColor: "#fce7f3", isDriver: true, location: "left" },
  { id: "son1", name: "Son 1", emoji: "👦", color: "#059669", bgColor: "#d1fae5", isDriver: false, location: "left" },
  { id: "son2", name: "Son 2", emoji: "👦", color: "#059669", bgColor: "#d1fae5", isDriver: false, location: "left" },
  { id: "daughter1", name: "Daughter 1", emoji: "👧", color: "#7c3aed", bgColor: "#ede9fe", isDriver: false, location: "left" },
  { id: "daughter2", name: "Daughter 2", emoji: "👧", color: "#7c3aed", bgColor: "#ede9fe", isDriver: false, location: "left" },
  { id: "policeman", name: "Police", emoji: "👮", color: "#1e40af", bgColor: "#bfdbfe", isDriver: true, location: "left" },
  { id: "thief", name: "Thief", emoji: "🦹", color: "#dc2626", bgColor: "#fee2e2", isDriver: false, location: "left" },
];

// --- Rule Checking ---
function checkConstraints(characters: Character[]): string | null {
  const locations: Location[] = ["left", "right", "raft"];

  for (const loc of locations) {
    const atLocation = characters.filter((c) => c.location === loc);
    if (atLocation.length === 0) continue;

    const ids = atLocation.map((c) => c.id);
    const hasThief = ids.includes("thief");
    const hasPoliceman = ids.includes("policeman");
    const hasFather = ids.includes("father");
    const hasMother = ids.includes("mother");
    const hasSons = ids.includes("son1") || ids.includes("son2");
    const hasDaughters = ids.includes("daughter1") || ids.includes("daughter2");
    const hasAnyFamily = hasFather || hasMother || hasSons || hasDaughters;

    // Thief cannot be with any family member without the Policeman
    if (hasThief && hasAnyFamily && !hasPoliceman) {
      const familyPresent = atLocation.filter(
        (c) => !["thief", "policeman"].includes(c.id)
      );
      if (familyPresent.length > 0) {
        return `🚨 The Thief is with ${familyPresent[0].name} without the Policeman on the ${loc === "raft" ? "raft" : loc + " bank"}!`;
      }
    }

    // Daughters cannot be with Father without Mother
    if (hasDaughters && hasFather && !hasMother) {
      return `⚠️ Daughter(s) left with Father without Mother on the ${loc === "raft" ? "raft" : loc + " bank"}!`;
    }

    // Sons cannot be with Mother without Father
    if (hasSons && hasMother && !hasFather) {
      return `⚠️ Son(s) left with Mother without Father on the ${loc === "raft" ? "raft" : loc + " bank"}!`;
    }
  }

  return null;
}

// --- Water Wave Component ---
function WaterWaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-full opacity-20"
          style={{
            top: `${15 + i * 16}%`,
            animation: `wave ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          <svg viewBox="0 0 1200 40" className="w-full h-6">
            <path
              d="M0,20 Q150,0 300,20 Q450,40 600,20 Q750,0 900,20 Q1050,40 1200,20"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

// --- Character Card ---
function CharacterCard({
  character,
  onClick,
  disabled,
  isOnRaft,
}: {
  character: Character;
  onClick: () => void;
  disabled: boolean;
  isOnRaft: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex flex-col items-center justify-center
        w-16 h-20 sm:w-[70px] sm:h-[88px]
        rounded-xl shadow-lg
        transition-all duration-300 ease-out
        ${disabled ? "opacity-40 cursor-not-allowed scale-95" : "cursor-pointer hover:scale-110 hover:shadow-xl hover:-translate-y-1 active:scale-95"}
        ${isOnRaft ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-blue-500" : ""}
      `}
      style={{
        background: `linear-gradient(135deg, ${character.bgColor}, white)`,
        border: `2px solid ${character.color}40`,
      }}
    >
      <span className="text-2xl sm:text-3xl mb-0.5 drop-shadow-sm">{character.emoji}</span>
      <span
        className="text-[9px] sm:text-[10px] font-bold tracking-tight leading-tight text-center px-0.5"
        style={{ color: character.color }}
      >
        {character.name}
      </span>
      {character.isDriver && (
        <span className="absolute -top-1.5 -right-1.5 text-xs bg-yellow-400 rounded-full w-4 h-4 flex items-center justify-center shadow-md border border-yellow-500" title="Can drive the raft">
          🚣
        </span>
      )}
      {!disabled && (
        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/20 transition-colors duration-200" />
      )}
    </button>
  );
}

// --- Raft Component ---
function Raft({
  characters,
  onCharacterClick,
  disabled,
}: {
  characters: Character[];
  onCharacterClick: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      {/* Raft base */}
      <div
        className="relative w-44 sm:w-52 h-28 sm:h-32 rounded-2xl flex items-center justify-center gap-2 sm:gap-3 shadow-2xl border-2 border-amber-700/40"
        style={{
          background: "linear-gradient(180deg, #d4a574 0%, #b8845a 40%, #9c6e42 100%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)",
        }}
      >
        {/* Wood grain lines */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute left-2 right-2 h-[1px] opacity-30"
            style={{
              top: `${20 + i * 15}%`,
              background: "linear-gradient(90deg, transparent, #6d4c2a, transparent)",
            }}
          />
        ))}

        {/* Raft slots */}
        {[0, 1].map((slot) => (
          <div
            key={slot}
            className={`
              w-16 h-20 sm:w-[70px] sm:h-[88px] rounded-xl border-2 border-dashed
              flex items-center justify-center
              transition-all duration-300
              ${characters[slot] ? "border-transparent" : "border-amber-900/30 bg-amber-800/10"}
            `}
          >
            {characters[slot] ? (
              <CharacterCard
                character={characters[slot]}
                onClick={() => onCharacterClick(characters[slot].id)}
                disabled={disabled}
                isOnRaft={true}
              />
            ) : (
              <span className="text-amber-900/20 text-2xl">+</span>
            )}
          </div>
        ))}
      </div>
      {/* Rope */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full bg-amber-900/60 shadow-inner" />
    </div>
  );
}

// --- Bank Component ---
function Bank({
  side,
  characters,
  onCharacterClick,
  disabled,
}: {
  side: "left" | "right";
  characters: Character[];
  onCharacterClick: (id: string) => void;
  disabled: boolean;
}) {
  const isLeft = side === "left";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{isLeft ? "🏕️" : "🏠"}</span>
        <h3 className="text-sm sm:text-base font-bold text-green-900">
          {isLeft ? "Starting Shore" : "Destination"}
        </h3>
      </div>

      <div
        className="relative min-h-[230px] w-40 sm:w-52 rounded-2xl p-3 shadow-xl border border-green-400/30"
        style={{
          background: isLeft
            ? "linear-gradient(180deg, #86efac 0%, #4ade80 30%, #22c55e 70%, #65a30d 100%)"
            : "linear-gradient(180deg, #86efac 0%, #4ade80 30%, #22c55e 70%, #65a30d 100%)",
        }}
      >
        {/* Grass texture dots */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-green-700/20"
            style={{
              left: `${10 + (i * 17) % 80}%`,
              top: `${5 + (i * 23) % 85}%`,
            }}
          />
        ))}

        <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-2.5 place-items-center">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              onClick={() => onCharacterClick(char.id)}
              disabled={disabled}
              isOnRaft={false}
            />
          ))}
        </div>

        {characters.length === 0 && (
          <div className="flex items-center justify-center h-full text-green-800/40 text-sm italic">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main App ---
export function App() {
  const [gameState, setGameState] = useState<GameState>({
    characters: createInitialCharacters(),
    raftPosition: "left",
    moveCount: 0,
    gameOver: false,
    gameWon: false,
    message: "Click characters to board the raft, then sail across! 🚣",
    messageType: "info",
    history: [],
  });

  const raftAnimRef = useRef<HTMLDivElement>(null);

  const charactersOnRaft = gameState.characters.filter((c) => c.location === "raft");
  const charactersOnLeft = gameState.characters.filter((c) => c.location === "left");
  const charactersOnRight = gameState.characters.filter((c) => c.location === "right");
  const hasDriverOnRaft = charactersOnRaft.some((c) => c.isDriver);

  // Check win
  useEffect(() => {
    if (gameState.characters.every((c) => c.location === "right") && !gameState.gameWon) {
      setGameState((prev) => ({
        ...prev,
        gameWon: true,
        message: `🎉 Congratulations! You solved it in ${prev.moveCount} moves!`,
        messageType: "success",
      }));
    }
  }, [gameState.characters, gameState.gameWon, gameState.moveCount]);

  const handleCharacterClick = useCallback(
    (charId: string) => {
      if (gameState.gameOver || gameState.gameWon) return;

      setGameState((prev) => {
        const char = prev.characters.find((c) => c.id === charId)!;
        const onRaft = prev.characters.filter((c) => c.location === "raft");

        // Character is on raft → move to current bank
        if (char.location === "raft") {
          const newChars = prev.characters.map((c) =>
            c.id === charId ? { ...c, location: prev.raftPosition as Location } : c
          );
          return {
            ...prev,
            characters: newChars,
            message: `${char.name} stepped off the raft.`,
            messageType: "info" as const,
          };
        }

        // Character is on a bank → can only board if raft is at their bank
        if (char.location !== prev.raftPosition) {
          return {
            ...prev,
            message: `⛔ The raft is on the other side!`,
            messageType: "warning" as const,
          };
        }

        // Check raft capacity
        if (onRaft.length >= 2) {
          return {
            ...prev,
            message: `⛔ The raft is full! (Max 2 people)`,
            messageType: "warning" as const,
          };
        }

        const newChars = prev.characters.map((c) =>
          c.id === charId ? { ...c, location: "raft" as Location } : c
        );

        return {
          ...prev,
          characters: newChars,
          message: `${char.name} boarded the raft.`,
          messageType: "info" as const,
        };
      });
    },
    [gameState.gameOver, gameState.gameWon]
  );

  const handleSail = useCallback(() => {
    if (gameState.gameOver || gameState.gameWon) return;

    if (charactersOnRaft.length === 0) {
      setGameState((prev) => ({
        ...prev,
        message: "⛔ Nobody on the raft!",
        messageType: "warning",
      }));
      return;
    }

    if (!hasDriverOnRaft) {
      setGameState((prev) => ({
        ...prev,
        message: "⛔ No driver on the raft! (Father, Mother, or Policeman must drive)",
        messageType: "error",
      }));
      return;
    }

    const newRaftPos: RaftPosition = gameState.raftPosition === "left" ? "right" : "left";

    // After moving, disembark everyone to the new bank for constraint checking
    const tempChars = gameState.characters.map((c) =>
      c.location === "raft" ? { ...c, location: newRaftPos as Location } : c
    );

    const violation = checkConstraints(tempChars);

    if (violation) {
      setGameState((prev) => ({
        ...prev,
        // Move raft to the other side and disembark
        characters: tempChars,
        raftPosition: newRaftPos,
        moveCount: prev.moveCount + 1,
        gameOver: true,
        message: violation,
        messageType: "error",
      }));
      return;
    }

    // Also check if the raft people staying on raft would violate (they disembark)
    // Actually let's just keep them on the new bank
    setGameState((prev) => ({
      ...prev,
      characters: tempChars,
      raftPosition: newRaftPos,
      moveCount: prev.moveCount + 1,
      message: `⛵ Sailed to the ${newRaftPos} bank! (Move #${prev.moveCount + 1})`,
      messageType: "info",
      history: [
        ...prev.history,
        {
          characters: prev.characters,
          raftPosition: prev.raftPosition,
          moveCount: prev.moveCount,
        },
      ],
    }));
  }, [gameState, charactersOnRaft, hasDriverOnRaft]);

  const handleUndo = useCallback(() => {
    if (gameState.history.length === 0) return;
    const lastState = gameState.history[gameState.history.length - 1];
    setGameState((prev) => ({
      ...prev,
      characters: lastState.characters,
      raftPosition: lastState.raftPosition,
      moveCount: lastState.moveCount,
      gameOver: false,
      gameWon: false,
      message: "↩️ Move undone!",
      messageType: "info",
      history: prev.history.slice(0, -1),
    }));
  }, [gameState.history]);

  const handleReset = useCallback(() => {
    setGameState({
      characters: createInitialCharacters(),
      raftPosition: "left",
      moveCount: 0,
      gameOver: false,
      gameWon: false,
      message: "🔄 Game reset! Click characters to board the raft, then sail across!",
      messageType: "info",
      history: [],
    });
  }, []);

  const msgBg = {
    info: "from-blue-500/90 to-blue-600/90",
    error: "from-red-500/90 to-red-600/90",
    success: "from-emerald-500/90 to-emerald-600/90",
    warning: "from-amber-500/90 to-amber-600/90",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 flex flex-col items-center overflow-x-hidden">
      {/* Inline keyframes */}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(-5%) translateY(0); }
          50% { transform: translateX(5%) translateY(4px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes sailLeft {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0%); }
        }
        @keyframes sailRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        @keyframes clouds {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(calc(100vw + 100%)); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Sky decorations */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none">
        <div className="absolute text-5xl opacity-70" style={{ top: "10px", animation: "clouds 25s linear infinite" }}>☁️</div>
        <div className="absolute text-3xl opacity-50" style={{ top: "40px", animation: "clouds 35s linear infinite", animationDelay: "10s" }}>☁️</div>
        <div className="absolute text-4xl opacity-60" style={{ top: "5px", animation: "clouds 30s linear infinite", animationDelay: "5s" }}>☁️</div>
        <div className="absolute text-2xl opacity-40" style={{ top: "60px", animation: "clouds 40s linear infinite", animationDelay: "15s" }}>⛅</div>
      </div>

      {/* Title */}
      <div className="relative z-10 mt-4 sm:mt-6 mb-3 sm:mb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg tracking-tight">
          🏞️ River Crossing Puzzle
        </h1>
        <p className="text-sky-100 text-xs sm:text-sm mt-1 font-medium">
          Get everyone safely to the other side!
        </p>
      </div>

      {/* Move Counter & Controls */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-white font-bold text-sm shadow-lg border border-white/30">
          Moves: {gameState.moveCount}
        </div>
        <button
          onClick={handleUndo}
          disabled={gameState.history.length === 0}
          className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white font-bold text-sm shadow-lg border border-white/30 hover:bg-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↩️ Undo
        </button>
        <button
          onClick={handleReset}
          className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white font-bold text-sm shadow-lg border border-white/30 hover:bg-white/30 transition-colors"
        >
          🔄 Reset
        </button>
      </div>

      {/* Message Bar */}
      <div
        className={`relative z-10 mb-4 px-5 py-2.5 rounded-xl bg-gradient-to-r ${msgBg[gameState.messageType]} text-white font-semibold text-sm shadow-lg backdrop-blur-sm max-w-lg text-center border border-white/20`}
      >
        {gameState.message}
      </div>

      {/* Game Board */}
      <div className="relative z-10 flex items-start justify-center gap-2 sm:gap-4 w-full max-w-4xl px-2 sm:px-4">
        {/* Left Bank */}
        <Bank
          side="left"
          characters={charactersOnLeft}
          onCharacterClick={handleCharacterClick}
          disabled={gameState.gameOver || gameState.gameWon}
        />

        {/* River Section */}
        <div className="flex flex-col items-center gap-3 flex-1 min-w-[180px] sm:min-w-[220px]">
          {/* River */}
          <div
            className="relative w-full min-h-[300px] rounded-2xl overflow-hidden shadow-inner"
            style={{
              background: "linear-gradient(180deg, #0ea5e9 0%, #0284c7 30%, #0369a1 70%, #075985 100%)",
            }}
          >
            <WaterWaves />

            {/* Fish decorations */}
            <div className="absolute bottom-4 left-4 text-lg opacity-30" style={{ animation: "float 4s ease-in-out infinite" }}>🐟</div>
            <div className="absolute bottom-8 right-6 text-sm opacity-20" style={{ animation: "float 3s ease-in-out infinite", animationDelay: "1s" }}>🐠</div>

            {/* Raft Area */}
            <div
              ref={raftAnimRef}
              className={`absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out ${
                gameState.raftPosition === "left" ? "left-0 sm:left-0" : "left-[calc(100%-176px)] sm:left-[calc(100%-208px)]"
              }`}
              style={{ animation: "float 3s ease-in-out infinite" }}
            >
              <Raft
                characters={charactersOnRaft}
                onCharacterClick={handleCharacterClick}
                disabled={gameState.gameOver || gameState.gameWon}
              />
            </div>
          </div>

          {/* Sail Button */}
          <button
            onClick={handleSail}
            disabled={
              gameState.gameOver ||
              gameState.gameWon ||
              charactersOnRaft.length === 0
            }
            className={`
              relative group px-8 py-3 rounded-xl font-bold text-lg text-white
              shadow-xl transition-all duration-300
              ${
                gameState.gameOver || gameState.gameWon || charactersOnRaft.length === 0
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer"
              }
            `}
          >
            <span className="flex items-center gap-2">
              {gameState.raftPosition === "left" ? "Sail Right ➡️" : "⬅️ Sail Left"}
            </span>
            {!(gameState.gameOver || gameState.gameWon || charactersOnRaft.length === 0) && (
              <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors" />
            )}
          </button>

          {!hasDriverOnRaft && charactersOnRaft.length > 0 && !gameState.gameOver && !gameState.gameWon && (
            <p className="text-red-200 text-xs font-semibold bg-red-900/40 px-3 py-1 rounded-lg">
              ⚠️ Need a driver! (👨 👩 or 👮)
            </p>
          )}
        </div>

        {/* Right Bank */}
        <Bank
          side="right"
          characters={charactersOnRight}
          onCharacterClick={handleCharacterClick}
          disabled={gameState.gameOver || gameState.gameWon}
        />
      </div>

      {/* Rules Panel */}
      <div className="relative z-10 mt-6 mb-8 w-full max-w-2xl px-4">
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20">
          <h3 className="text-white font-bold text-base mb-3 text-center">📜 Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-white/90">
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">🚣</span>
              <span><strong>Drivers:</strong> Only Father, Mother, or Policeman can operate the raft.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">⛵</span>
              <span><strong>Raft:</strong> Max 2 people. Needs at least 1 driver to sail.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">🦹</span>
              <span><strong>Thief:</strong> Cannot be with any family member without the Policeman.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">👧</span>
              <span><strong>Daughters:</strong> Cannot be with Father unless Mother is present.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">👦</span>
              <span><strong>Sons:</strong> Cannot be with Mother unless Father is present.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/10 rounded-lg p-2">
              <span className="text-base">🏆</span>
              <span><strong>Win:</strong> Move all 8 characters to the destination shore!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Win Overlay */}
      {gameState.gameWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4 border-4 border-yellow-300">
            <div className="text-6xl mb-4">🎉🏆🎉</div>
            <h2 className="text-3xl font-extrabold text-white mb-2">You Win!</h2>
            <p className="text-green-100 text-lg mb-1">
              Solved in <strong className="text-yellow-200">{gameState.moveCount}</strong> moves!
            </p>
            <p className="text-green-200 text-sm mb-6">Everyone crossed safely!</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white text-green-700 font-bold rounded-xl shadow-lg hover:bg-green-50 hover:scale-105 transition-all active:scale-95 cursor-pointer"
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-red-400 to-red-700 rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4 border-4 border-red-300">
            <div className="text-6xl mb-4">🚨❌🚨</div>
            <h2 className="text-3xl font-extrabold text-white mb-2">Rule Violated!</h2>
            <p className="text-red-100 text-sm mb-6 leading-relaxed">
              {gameState.message}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleUndo}
                className="px-5 py-3 bg-white/20 text-white font-bold rounded-xl shadow-lg hover:bg-white/30 transition-all hover:scale-105 active:scale-95 border border-white/30 cursor-pointer"
              >
                ↩️ Undo
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-3 bg-white text-red-700 font-bold rounded-xl shadow-lg hover:bg-red-50 hover:scale-105 transition-all active:scale-95 cursor-pointer"
              >
                🔄 Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
