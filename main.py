#!/usr/bin/env python3
"""
HYPE/USDC Liquidity Sweep Scalper — Hyperliquid Perps
Trades 1m + 3m timeframes, 87% margin, TP 0.3% / SL 0.2%, 5-8 min cycle.
"""

import os
import sys
import json
import time
import logging
import datetime as dt
from pathlib import Path

import eth_account
from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants

# ── Config ──────────────────────────────────────────────────────────────────
COIN = "HYPE"
MARGIN_USE = 0.87            # 87 % of available margin
TP_PCT = 0.003               # 0.3 % take-profit
SL_PCT = 0.002               # 0.2 % stop-loss
MIN_CYCLE_SEC = 5 * 60       # 5 min minimum between trades
MAX_CYCLE_SEC = 8 * 60       # 8 min max wait before forcing re-scan
LOOKBACK_CANDLES = 20        # candles to find recent highs/lows
SWEEP_WICK_RATIO = 0.6       # wick must be ≥60 % of candle range to count
POLL_SEC = 5                 # seconds between checks while in a position
SCAN_SEC = 3                 # seconds between scans when flat

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
TRADE_LOG = LOG_DIR / "trades.jsonl"

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "bot.log"),
    ],
)
log = logging.getLogger("sweep-scalper")

# ── Helpers ─────────────────────────────────────────────────────────────────

def load_keys():
    """Load wallet private key from env or .env file."""
    key = os.getenv("HL_PRIVATE_KEY", "")
    if not key:
        env_path = Path(__file__).parent / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("HL_PRIVATE_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        log.error("Set HL_PRIVATE_KEY in environment or .env file")
        sys.exit(1)
    return key


def setup_clients(private_key: str):
    account = eth_account.Account.from_key(private_key)
    address = account.address
    info = Info(constants.MAINNET_API_URL, skip_ws=True)
    exchange = Exchange(account, constants.MAINNET_API_URL)
    log.info("Connected  wallet=%s", address)
    return info, exchange, address


def get_candles(info: Info, coin: str, interval: str, count: int):
    """Fetch recent candles. interval = '1m' or '3m'."""
    now_ms = int(time.time() * 1000)
    minutes = int(interval.replace("m", ""))
    start_ms = now_ms - count * minutes * 60 * 1000
    raw = info.candles_snapshot(coin, interval, start_ms, now_ms)
    candles = []
    for c in raw:
        candles.append({
            "t": c["t"],
            "o": float(c["o"]),
            "h": float(c["h"]),
            "l": float(c["l"]),
            "c": float(c["c"]),
            "v": float(c["v"]),
        })
    return candles


def recent_extremes(candles, n=LOOKBACK_CANDLES):
    """Return (recent_low, recent_high) over last n candles (excluding last)."""
    subset = candles[-(n + 1):-1]  # exclude the forming candle
    if len(subset) < 3:
        return None, None
    lows = [c["l"] for c in subset]
    highs = [c["h"] for c in subset]
    return min(lows), max(highs)


def detect_sweep(candles, n=LOOKBACK_CANDLES):
    """
    Liquidity sweep detection on the most recent *closed* candle.
    Returns 'long', 'short', or None.

    Long signal:  wick below recent lows → candle closed back above those lows
                  (buyers swept the sell-side liquidity).
    Short signal: wick above recent highs → candle closed back below those highs
                  (sellers swept the buy-side liquidity).
    """
    if len(candles) < n + 2:
        return None

    recent_low, recent_high = recent_extremes(candles, n)
    if recent_low is None:
        return None

    last = candles[-2]  # last *closed* candle
    rng = last["h"] - last["l"]
    if rng == 0:
        return None

    # Long sweep: wick went below recent low, close came back above it
    lower_wick = min(last["o"], last["c"]) - last["l"]
    if last["l"] < recent_low and last["c"] > recent_low:
        if lower_wick / rng >= SWEEP_WICK_RATIO:
            return "long"

    # Short sweep: wick went above recent high, close came back below it
    upper_wick = last["h"] - max(last["o"], last["c"])
    if last["h"] > recent_high and last["c"] < recent_high:
        if upper_wick / rng >= SWEEP_WICK_RATIO:
            return "short"

    return None


def get_available_margin(info: Info, address: str):
    """Return available margin in USDC."""
    state = info.user_state(address)
    margin = float(state.get("withdrawable", "0"))
    return margin


def get_mid_price(info: Info, coin: str):
    """Return current mid price for the coin."""
    all_mids = info.all_mids()
    return float(all_mids.get(coin, 0))


def get_position(info: Info, address: str, coin: str):
    """Return (size, entry_price, unrealized_pnl) or (0, 0, 0) if flat."""
    state = info.user_state(address)
    for pos in state.get("assetPositions", []):
        item = pos.get("position", {})
        if item.get("coin") == coin:
            sz = float(item.get("szi", "0"))
            entry = float(item.get("entryPx", "0"))
            upnl = float(item.get("unrealizedPnl", "0"))
            return sz, entry, upnl
    return 0.0, 0.0, 0.0


def round_size(size: float, coin: str):
    """Round to Hyperliquid's size decimals for HYPE (1 decimal)."""
    return round(size, 1)


def round_price(price: float, coin: str):
    """Round to Hyperliquid's price decimals for HYPE (2 decimals)."""
    return round(price, 2)


def place_order(exchange: Exchange, coin: str, is_buy: bool, size: float, price: float, reduce_only=False):
    """Place a limit order (post-only style at mid for fast fill)."""
    sz = round_size(abs(size), coin)
    px = round_price(price, coin)
    order_result = exchange.order(
        coin,
        is_buy,
        sz,
        px,
        {"limit": {"tif": "Ioc"}},  # immediate-or-cancel for fast scalps
        reduce_only=reduce_only,
    )
    log.info("ORDER  side=%s  size=%.1f  price=%.2f  reduce=%s  result=%s",
             "BUY" if is_buy else "SELL", sz, px, reduce_only, order_result)
    return order_result


def market_close(exchange: Exchange, info: Info, address: str, coin: str):
    """Close the current position at market."""
    sz, entry, _ = get_position(info, address, coin)
    if abs(sz) < 0.1:
        return
    is_buy = sz < 0  # buy to close short, sell to close long
    mid = get_mid_price(info, coin)
    # use aggressive price to ensure fill
    slippage = 0.005
    if is_buy:
        price = mid * (1 + slippage)
    else:
        price = mid * (1 - slippage)
    place_order(exchange, coin, is_buy, abs(sz), price, reduce_only=True)


def log_trade(entry_data: dict):
    """Append a trade record to the JSONL log."""
    with open(TRADE_LOG, "a") as f:
        f.write(json.dumps(entry_data) + "\n")
    log.info("TRADE LOG  %s", json.dumps(entry_data))


# ── Main Loop ───────────────────────────────────────────────────────────────

def run():
    private_key = load_keys()
    info, exchange, address = setup_clients(private_key)

    log.info("=" * 60)
    log.info("HYPE/USDC Liquidity Sweep Scalper starting")
    log.info("TP=%.1f%%  SL=%.1f%%  Margin=%.0f%%  Cycle=%d-%ds",
             TP_PCT * 100, SL_PCT * 100, MARGIN_USE * 100, MIN_CYCLE_SEC, MAX_CYCLE_SEC)
    log.info("=" * 60)

    last_trade_time = 0
    trade_count = 0

    while True:
        try:
            # ── Check if we have a position ──
            sz, entry_px, upnl = get_position(info, address, COIN)

            if abs(sz) >= 0.1:
                # We're in a trade — monitor TP/SL
                mid = get_mid_price(info, COIN)
                if sz > 0:  # long
                    pnl_pct = (mid - entry_px) / entry_px
                    tp_hit = pnl_pct >= TP_PCT
                    sl_hit = pnl_pct <= -SL_PCT
                else:  # short
                    pnl_pct = (entry_px - mid) / entry_px
                    tp_hit = pnl_pct >= TP_PCT
                    sl_hit = pnl_pct <= -SL_PCT

                if tp_hit or sl_hit:
                    reason = "TP" if tp_hit else "SL"
                    log.info("CLOSING  reason=%s  pnl_pct=%.4f%%  mid=%.2f", reason, pnl_pct * 100, mid)
                    market_close(exchange, info, address, COIN)
                    time.sleep(2)

                    # Confirm closed
                    sz2, _, _ = get_position(info, address, COIN)
                    realized_pnl = pnl_pct * abs(sz) * entry_px  # approx

                    trade_count += 1
                    log_trade({
                        "trade_num": trade_count,
                        "time_open": dt.datetime.utcfromtimestamp(last_trade_time).isoformat() + "Z",
                        "time_close": dt.datetime.utcnow().isoformat() + "Z",
                        "side": "LONG" if sz > 0 else "SHORT",
                        "entry": entry_px,
                        "exit": mid,
                        "size": abs(sz),
                        "pnl_pct": round(pnl_pct * 100, 4),
                        "pnl_usd": round(realized_pnl, 4),
                        "reason": reason,
                    })

                    last_trade_time = time.time()
                    log.info("Position closed — scanning for next entry immediately")
                    continue  # jump back to scan
                else:
                    # Check time-based exit (force close after MAX_CYCLE_SEC)
                    elapsed = time.time() - last_trade_time
                    if elapsed > MAX_CYCLE_SEC and last_trade_time > 0:
                        log.info("MAX CYCLE TIME reached (%.0fs) — closing position", elapsed)
                        market_close(exchange, info, address, COIN)
                        time.sleep(2)
                        sz2, _, _ = get_position(info, address, COIN)
                        mid = get_mid_price(info, COIN)
                        realized_pnl = pnl_pct * abs(sz) * entry_px
                        trade_count += 1
                        log_trade({
                            "trade_num": trade_count,
                            "time_open": dt.datetime.utcfromtimestamp(last_trade_time).isoformat() + "Z",
                            "time_close": dt.datetime.utcnow().isoformat() + "Z",
                            "side": "LONG" if sz > 0 else "SHORT",
                            "entry": entry_px,
                            "exit": mid,
                            "size": abs(sz),
                            "pnl_pct": round(pnl_pct * 100, 4),
                            "pnl_usd": round(realized_pnl, 4),
                            "reason": "TIMEOUT",
                        })
                        last_trade_time = time.time()
                        continue

                time.sleep(POLL_SEC)
                continue

            # ── Flat — look for entry ──
            elapsed_since_last = time.time() - last_trade_time
            if last_trade_time > 0 and elapsed_since_last < MIN_CYCLE_SEC:
                remaining = MIN_CYCLE_SEC - elapsed_since_last
                log.info("Cooldown: %.0fs remaining before next scan", remaining)
                time.sleep(min(remaining, SCAN_SEC))
                continue

            # Fetch candles on both timeframes
            candles_1m = get_candles(info, COIN, "1m", LOOKBACK_CANDLES + 5)
            candles_3m = get_candles(info, COIN, "3m", LOOKBACK_CANDLES + 5)

            signal_1m = detect_sweep(candles_1m)
            signal_3m = detect_sweep(candles_3m)

            # Prefer aligned signals; accept single-timeframe if strong
            signal = None
            if signal_1m and signal_3m and signal_1m == signal_3m:
                signal = signal_1m
                log.info("ALIGNED SIGNAL  1m=%s  3m=%s", signal_1m, signal_3m)
            elif signal_1m:
                signal = signal_1m
                log.info("1m SIGNAL  %s  (3m=%s)", signal_1m, signal_3m)
            elif signal_3m:
                signal = signal_3m
                log.info("3m SIGNAL  %s  (1m=%s)", signal_3m, signal_1m)
            else:
                # Force scan more aggressively after MAX_CYCLE_SEC of being flat
                if last_trade_time > 0 and elapsed_since_last > MAX_CYCLE_SEC:
                    log.info("No sweep signal after %.0fs — rechecking in %ds", elapsed_since_last, SCAN_SEC)
                time.sleep(SCAN_SEC)
                continue

            # ── Place entry ──
            margin = get_available_margin(info, address)
            if margin < 1:
                log.warning("Insufficient margin: $%.2f", margin)
                time.sleep(SCAN_SEC)
                continue

            mid = get_mid_price(info, COIN)
            if mid <= 0:
                log.warning("Invalid mid price: %.4f", mid)
                time.sleep(SCAN_SEC)
                continue

            trade_usd = margin * MARGIN_USE
            size = trade_usd / mid
            size = round_size(size, COIN)

            if size < 0.1:
                log.warning("Calculated size too small: %.1f", size)
                time.sleep(SCAN_SEC)
                continue

            is_buy = signal == "long"
            # Aggressive price for IOC fill
            slippage = 0.003
            if is_buy:
                price = mid * (1 + slippage)
            else:
                price = mid * (1 - slippage)

            log.info("ENTERING  %s  size=%.1f  price=%.2f  margin=$%.2f",
                     signal.upper(), size, price, trade_usd)

            result = place_order(exchange, COIN, is_buy, size, price)

            # Check if we got filled
            time.sleep(2)
            sz, entry_px, _ = get_position(info, address, COIN)
            if abs(sz) >= 0.1:
                last_trade_time = time.time()
                tp_price = entry_px * (1 + TP_PCT) if is_buy else entry_px * (1 - TP_PCT)
                sl_price = entry_px * (1 - SL_PCT) if is_buy else entry_px * (1 + SL_PCT)
                log.info("FILLED  entry=%.2f  size=%.1f  TP=%.2f  SL=%.2f",
                         entry_px, abs(sz), tp_price, sl_price)
            else:
                log.warning("Order not filled — will retry next scan")

        except KeyboardInterrupt:
            log.info("Shutting down — closing any open position")
            try:
                market_close(exchange, info, address, COIN)
            except Exception:
                pass
            break
        except Exception as e:
            log.error("Error: %s", e, exc_info=True)
            time.sleep(10)


if __name__ == "__main__":
    run()
