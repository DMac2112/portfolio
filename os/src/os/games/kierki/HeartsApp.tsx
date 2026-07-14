import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties,
} from 'react';
import type { AppProps } from '../../types';
import { useOSStore } from '../../store/osStore';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useSystem } from '../../context/SystemContext';
import { tone } from '../../sound';
import {
  newGame,
  togglePassCard,
  confirmPass,
  currentPlayer,
  legalMoves,
  playCard,
  chooseAiCard,
  playAiTurn,
  startNextRound,
  trickWinner,
  gameWinner,
  type Card,
  type GameState,
  type PassDirection,
  type Player,
  type TrickPlay,
} from './engine';
import { CardFace, CardBack, CARD_RATIO, cardLabel } from '../pasjans/cards';

const PLAYER_NAME = ['Ty', 'Gracz 1', 'Gracz 2', 'Gracz 3'] as const;
const PASS_LABEL: Record<PassDirection, string> = {
  left: 'w lewo',
  right: 'w prawo',
  across: 'naprzeciw',
  hold: 'bez wymiany',
};
const AI_DELAY = 360;
const TRICK_DELAY = 680;

type Sfx = 'deal' | 'select' | 'play' | 'trick' | 'error' | 'win';

interface BoardMetrics {
  humanW: number;
  humanH: number;
  humanStep: number;
  humanWidth: number;
  opponentW: number;
  opponentH: number;
  opponentStep: number;
  topWidth: number;
  sideHeight: number;
  trickW: number;
  trickH: number;
}

function boardMetrics(width: number, height: number, humanCards: number, opponentCards: number): BoardMetrics {
  const humanW = Math.max(28, Math.min(72, width / 9.5, height / 5.5));
  const humanH = humanW * CARD_RATIO;
  const usable = Math.max(humanW, width - 32);
  const humanStep = humanCards <= 1
    ? 0
    : Math.min(humanW * 0.7, Math.max(8, (usable - humanW) / (humanCards - 1)));
  const humanWidth = humanW + humanStep * Math.max(0, humanCards - 1);
  const opponentW = Math.max(21, Math.min(44, humanW * 0.68));
  const opponentH = opponentW * CARD_RATIO;
  const opponentStep = opponentCards <= 1 ? 0 : Math.min(10, opponentW * 0.24);
  const topWidth = opponentW + opponentStep * Math.max(0, opponentCards - 1);
  const sideHeight = opponentH + opponentStep * Math.max(0, opponentCards - 1);
  const trickW = Math.max(30, Math.min(56, width / 10, height / 7));
  return {
    humanW,
    humanH,
    humanStep,
    humanWidth,
    opponentW,
    opponentH,
    opponentStep,
    topWidth,
    sideHeight,
    trickW,
    trickH: trickW * CARD_RATIO,
  };
}

function phaseMessage(state: GameState, turn: Player | null): string {
  switch (state.phase) {
    case 'passing':
      return `Wybierz dokładnie 3 karty do przekazania ${PASS_LABEL[state.passDir]}.`;
    case 'playing':
      return turn === 0 ? 'Twój ruch.' : turn === null ? 'Rozgrywka trwa.' : `Ruch: ${PLAYER_NAME[turn]}.`;
    case 'roundEnd':
      return `Runda ${state.round} zakończona.`;
    case 'gameOver':
      return 'Koniec gry.';
  }
}

export default function HeartsApp({ windowId, focused }: AppProps) {
  const game = useRef<GameState>();
  if (!game.current) game.current = newGame();

  const boardRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const aiTimerRef = useRef<number | null>(null);
  const trickTimerRef = useRef<number | null>(null);
  const browserFocusedRef = useRef(typeof document === 'undefined' || document.hasFocus());

  const visible = usePageVisible();
  const minimized = useOSStore((state) => state.windows[windowId]?.state === 'minimized');
  const { prefs } = useSystem();
  const active = focused && visible && !minimized;
  const activeRef = useRef(active);
  activeRef.current = active && browserFocusedRef.current;

  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((value) => value + 1), []);
  const [boardSize, setBoardSize] = useState({ w: 720, h: 560 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [heldTrick, setHeldTrick] = useState<TrickPlay[] | null>(null);
  const [trickPause, setTrickPause] = useState(false);

  const sfx = useCallback(
    (kind: Sfx) => {
      if (prefs.muted) return;
      switch (kind) {
        case 'deal': tone(0, 260, 0.06, 0.05); break;
        case 'select': tone(0, 300, 0.04, 0.04, 'triangle'); break;
        case 'play': tone(0, 180, 0.04, 0.06); break;
        case 'trick': tone(0, 360, 0.08, 0.06); break;
        case 'error': tone(0, 140, 0.08, 0.06, 'sawtooth'); break;
        case 'win': tone(0, 523, 0.14, 0.08); tone(0.12, 659, 0.14, 0.08); tone(0.24, 784, 0.3, 0.08); break;
      }
    },
    [prefs.muted],
  );

  const clearTimers = useCallback(() => {
    if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    if (trickTimerRef.current !== null) window.clearTimeout(trickTimerRef.current);
    aiTimerRef.current = null;
    trickTimerRef.current = null;
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBoardSize({ w: rect.width, h: rect.height });
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active) return;
    clearTimers();
    setMenuOpen(false);
    setHeldTrick(null);
    setTrickPause(false);
  }, [active, clearTimers]);

  useEffect(() => {
    const onBlur = () => {
      browserFocusedRef.current = false;
      clearTimers();
    };
    const onFocus = () => {
      browserFocusedRef.current = true;
      setHeldTrick(null);
      setTrickPause(false);
      bump();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      clearTimers();
    };
  }, [bump, clearTimers]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: Event) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const settlePlay = useCallback(
    (before: TrickPlay[], player: Player, card: Card) => {
      sfx('play');
      if (before.length === 3) {
        const completed = [...before, { player, card }];
        const winner = trickWinner(completed);
        setHeldTrick(completed);
        setTrickPause(true);
        sfx('trick');
        setAnnounce(winner === null ? 'Lewa zakończona.' : `${PLAYER_NAME[winner]} bierze lewę.`);
        if (trickTimerRef.current !== null) window.clearTimeout(trickTimerRef.current);
        trickTimerRef.current = window.setTimeout(() => {
          trickTimerRef.current = null;
          setHeldTrick(null);
          setTrickPause(false);
        }, TRICK_DELAY);
      } else {
        setAnnounce(`${PLAYER_NAME[player]} zagrywa ${cardLabel(card)}.`);
      }
      bump();
    },
    [bump, sfx],
  );

  useEffect(() => {
    const state = game.current!;
    if (!active || !browserFocusedRef.current || trickPause || state.phase !== 'playing') return;
    const player = currentPlayer(state);
    if (player === null || player === 0) return;

    const timer = window.setTimeout(() => {
      aiTimerRef.current = null;
      const live = game.current!;
      const livePlayer = currentPlayer(live);
      if (!activeRef.current || livePlayer === null || livePlayer === 0 || live.phase !== 'playing') return;
      const chosen = chooseAiCard(live, livePlayer);
      const before = [...live.trick];
      if (!chosen || !playAiTurn(live)) {
        sfx('error');
        setAnnounce('Komputer nie może wykonać ruchu.');
        return;
      }
      settlePlay(before, livePlayer, chosen);
    }, AI_DELAY);
    aiTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (aiTimerRef.current === timer) aiTimerRef.current = null;
    };
  }, [active, settlePlay, sfx, trickPause, version]);

  const lastPhaseRef = useRef(`${game.current.round}:${game.current.phase}`);
  useEffect(() => {
    const state = game.current!;
    const key = `${state.round}:${state.phase}`;
    if (key === lastPhaseRef.current) return;
    lastPhaseRef.current = key;
    if (state.phase === 'roundEnd') {
      sfx('win');
      setAnnounce(`Runda ${state.round} zakończona.`);
    } else if (state.phase === 'gameOver') {
      const winner = gameWinner(state);
      sfx('win');
      setAnnounce(winner === null ? 'Koniec gry.' : `Koniec gry. Wygrywa ${PLAYER_NAME[winner]}.`);
    }
  }, [sfx, version]);

  const dealNew = useCallback(() => {
    clearTimers();
    game.current = newGame();
    lastPhaseRef.current = `${game.current.round}:${game.current.phase}`;
    setHeldTrick(null);
    setTrickPause(false);
    setAnnounce('Nowa gra. Wybierz trzy karty do wymiany.');
    setMenuOpen(false);
    sfx('deal');
    bump();
  }, [bump, clearTimers, sfx]);

  const nextRound = useCallback(() => {
    clearTimers();
    const state = game.current!;
    if (!startNextRound(state)) {
      sfx('error');
      return;
    }
    setHeldTrick(null);
    setTrickPause(false);
    setMenuOpen(false);
    setAnnounce(state.passDir === 'hold'
      ? `Runda ${state.round}, bez wymiany.`
      : `Runda ${state.round}. Wybierz trzy karty do przekazania ${PASS_LABEL[state.passDir]}.`);
    sfx('deal');
    bump();
  }, [bump, clearTimers, sfx]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        dealNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, dealNew]);

  const onHumanCard = useCallback(
    (card: Card) => {
      const state = game.current!;
      if (!activeRef.current || trickPause) return;
      if (state.phase === 'passing') {
        const selected = state.pendingPass.some((candidate) => candidate.id === card.id);
        if (!selected && state.pendingPass.length >= 3) {
          sfx('error');
          setAnnounce('Wybrano już trzy karty. Odznacz jedną, aby zmienić wybór.');
          return;
        }
        if (!togglePassCard(state, card.id)) {
          sfx('error');
          return;
        }
        sfx('select');
        setAnnounce(`Wybrano ${state.pendingPass.length} z 3 kart.`);
        bump();
        return;
      }
      if (state.phase !== 'playing' || currentPlayer(state) !== 0) {
        sfx('error');
        setAnnounce('Poczekaj na swój ruch.');
        return;
      }
      if (!legalMoves(state, 0).some((legal) => legal.id === card.id)) {
        sfx('error');
        setAnnounce(`${cardLabel(card)} nie jest teraz dozwolona.`);
        return;
      }
      const before = [...state.trick];
      if (!playCard(state, 0, card.id)) {
        sfx('error');
        return;
      }
      settlePlay(before, 0, card);
    },
    [bump, settlePlay, sfx, trickPause],
  );

  const onConfirmPass = useCallback(() => {
    const state = game.current!;
    if (!activeRef.current || state.pendingPass.length !== 3 || !confirmPass(state)) {
      sfx('error');
      return;
    }
    sfx('deal');
    setAnnounce('Karty wymienione. Rozgrywka rozpoczęta.');
    bump();
  }, [bump, sfx]);

  const state = game.current;
  const turn = currentPlayer(state);
  const legalIds = new Set(turn === 0 ? legalMoves(state, 0).map((card) => card.id) : []);
  const shownTrick = heldTrick ?? state.trick;
  const maxOpponentCards = Math.max(0, ...state.hands.slice(1).map((hand) => hand.length));
  const metrics = boardMetrics(boardSize.w, boardSize.h, state.hands[0].length, maxOpponentCards);
  const winner = gameWinner(state);
  const message = phaseMessage(state, turn);

  const opponent = (player: 1 | 2 | 3, position: 'left' | 'top' | 'right') => {
    const hand = state.hands[player];
    const horizontal = position === 'top';
    const style: CSSProperties = horizontal
      ? { width: metrics.topWidth, height: metrics.opponentH }
      : { width: metrics.opponentW, height: metrics.sideHeight };
    return (
      <div className={`kierki__opponent kierki__opponent--${position}`} aria-label={`${PLAYER_NAME[player]}, ${hand.length} kart zakrytych`}>
        <span className="kierki__player-label">{PLAYER_NAME[player]} · {hand.length}</span>
        <div className="kierki__opponent-hand" style={style} aria-hidden="true">
          {hand.map((card, index) => (
            <span
              key={card.id}
              className="kierki__back"
              style={horizontal
                ? { left: index * metrics.opponentStep, top: 0, zIndex: index + 1 }
                : { left: 0, top: index * metrics.opponentStep, zIndex: index + 1 }}
            >
              <CardBack width={metrics.opponentW} />
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="kierki">
      <div className="kierki__menu" ref={menuWrapRef}>
        <button
          type="button"
          className="kierki__menubtn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Gra
        </button>
        {menuOpen && (
          <div className="ctx-menu kierki__menudrop" role="menu">
            <button type="button" role="menuitem" onClick={dealNew}>
              Nowa gra <span>F2</span>
            </button>
            {state.phase === 'roundEnd' && (
              <button type="button" role="menuitem" onClick={nextRound}>Nowa runda</button>
            )}
          </div>
        )}
      </div>

      <div className="kierki__board" ref={boardRef} role="group" aria-label="Stół do gry w kierki">
        <div className="kierki__phase" id="kierki-phase">{message}</div>

        <table className="kierki__scoreboard" aria-label="Wyniki graczy">
          <thead>
            <tr><th>Gracz</th><th>Runda</th><th>Razem</th></tr>
          </thead>
          <tbody>
            {PLAYER_NAME.map((name, player) => (
              <tr key={name} className={turn === player ? 'is-turn' : undefined}>
                <th scope="row">{name}</th>
                <td>{state.roundScores[player]}</td>
                <td>{state.scores[player]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {opponent(1, 'left')}
        {opponent(2, 'top')}
        {opponent(3, 'right')}

        <div
          className="kierki__trick"
          role="list"
          aria-label={shownTrick.length ? 'Karty w bieżącej lewie' : 'Pusta lewa'}
          style={{ width: metrics.trickW * 3.2, height: metrics.trickH * 2.15 }}
        >
          {shownTrick.map((play) => (
            <div
              key={`${play.player}-${play.card.id}`}
              className={`kierki__trick-card kierki__trick-card--${play.player}`}
              role="listitem"
              aria-label={`${PLAYER_NAME[play.player]}: ${cardLabel(play.card)}`}
              style={{ width: metrics.trickW, height: metrics.trickH }}
            >
              <CardFace suit={play.card.suit} rank={play.card.rank} width={metrics.trickW} />
            </div>
          ))}
        </div>

        {state.phase === 'passing' && (
          <button
            type="button"
            className="kierki__pass-confirm"
            disabled={!active || state.pendingPass.length !== 3}
            style={{ bottom: metrics.humanH + 28 }}
            onClick={onConfirmPass}
          >
            Przekaż karty ({state.pendingPass.length}/3)
          </button>
        )}

        <div
          className="kierki__human-hand"
          role="group"
          aria-label={`Twoja ręka, ${state.hands[0].length} kart`}
          aria-describedby="kierki-phase"
          style={{ width: metrics.humanWidth, height: metrics.humanH }}
        >
          {state.hands[0].map((card, index) => {
            const selected = state.pendingPass.some((candidate) => candidate.id === card.id);
            const passBlocked = state.phase === 'passing' && state.pendingPass.length >= 3 && !selected;
            const playable = state.phase === 'playing' && turn === 0 && legalIds.has(card.id) && !trickPause;
            const canUse = active && (state.phase === 'passing' ? !passBlocked : playable);
            const reason = state.phase === 'passing'
              ? selected ? 'wybrana do wymiany' : passBlocked ? 'najpierw odznacz inną kartę' : 'wybierz do wymiany'
              : playable ? 'zagraj' : turn === 0 ? 'ruch niedozwolony' : 'poczekaj na swoją kolej';
            return (
              <button
                key={card.id}
                type="button"
                className={`kierki__human-card${selected ? ' is-selected' : ''}${canUse ? ' is-actionable' : ' is-disabled'}`}
                style={{
                  left: index * metrics.humanStep,
                  width: metrics.humanW,
                  height: metrics.humanH,
                  zIndex: index + 1,
                }}
                aria-label={`${cardLabel(card)} — ${reason}`}
                aria-pressed={state.phase === 'passing' ? selected : undefined}
                aria-disabled={!canUse}
                onClick={() => onHumanCard(card)}
              >
                <CardFace suit={card.suit} rank={card.rank} width={metrics.humanW} />
              </button>
            );
          })}
        </div>

        {!active && (
          <div className="kierki__overlay">
            <strong>PAUZA</strong>
            <span>Kliknij okno, aby wznowić</span>
          </div>
        )}

        {active && !trickPause && state.phase === 'roundEnd' && (
          <div className="kierki__overlay">
            <strong>Runda zakończona</strong>
            <span>Ty {state.roundScores[0]} · Gracz 1 {state.roundScores[1]} · Gracz 2 {state.roundScores[2]} · Gracz 3 {state.roundScores[3]}</span>
            <button type="button" onClick={nextRound}>▶ Nowa runda</button>
          </div>
        )}

        {active && !trickPause && state.phase === 'gameOver' && (
          <div className="kierki__overlay">
            <strong>Koniec gry</strong>
            <span>{winner === null ? 'Wyniki końcowe' : `Wygrywa ${PLAYER_NAME[winner]} z wynikiem ${state.scores[winner]}.`}</span>
            <button type="button" onClick={dealNew}>▶ Nowa gra (F2)</button>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">Runda {state.round}</p>
        <p className="status-bar-field">Wymiana: {PASS_LABEL[state.passDir]}</p>
        <p className="status-bar-field">Kiery: {state.heartsBroken ? 'otwarte' : 'zamknięte'}</p>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce || message}
      </div>
    </div>
  );
}
