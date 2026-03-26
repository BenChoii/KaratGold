#!/usr/bin/env python3
"""
HYPE/USDC Liquidity Sweep Scalper
- Trades on 1m and 3m timeframes only
- 87% of available margin per trade
- Liquidity sweep detection (wick reversals)
- TP 0.3%, SL 0.2% — fast scalps
- 5-8 min minimum between trades
- Immediate re-entry after each close
- Full trade log with entry, exit, pnl

Set HL_SIMULATE=false and provide HL_SECRET_KEY + HL_WALLET_ADDRESS for live trading.
"""

import json
import time
import os
import sys
import math
import random
import logging
from datetime import datetime, timezone
from pathlib import Path

SIMULATE = os.environ.get("HL_SIMULATE", "true").lower() == "true"

if not SIMULATE:
    from hyperliquid.info import Info
    from hyperliquid.exchange import Exchange
    from hyperliquid.utils import constants

# --------------- CONFIG ---------------
SYMBOL = "HYPE"
MARGIN_PCT = 0.87          # 87% of available margin
TP_PCT = 0.003             # 0.3% take profit
SL_PCT = 0.002             # 0.2% stop loss
MIN_WAIT_SEC = 5 * 60      # 5 minutes minimum between trades
MAX_WAIT_SEC = 8 * 60      # 8 minutes max scan window
LOOKBACK_1M = 20           # candles to look back for liquidity levels (1m)
LOOKBACK_3M = 10           # candles to look back for liquidity levels (3m)
SWEEP_WICK_RATIO = 0.6     # wick must be >= 60% of candle range to count as sweep
LOG_FILE = Path(__file__).parent / "trade_log.json"
TEXT_LOG = Path(__file__).parent / "trade_log.txt"

# Simulation: compress time so demo runs fast (1 real sec = 60 sim seconds)
SIM_TIME_FACTOR = 60
SIM_BASE_PRICE = 24.50     # starting HYPE price for simulation
SIM_VOLATILITY = 0.0015    # per-tick volatility (higher = more action)
SIM_BALANCE = 1000.0       # starting simulated balance

# --------------- LOGGING ---------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(TEXT_LOG, mode="a"),
    ],
)
log = logging.getLogger("scalper")


# --------------- SIMULATION ENGINE ---------------
class SimulatedMarket:
    """Generates realistic HYPE/USDC price action with liquidity sweeps."""

    def __init__(self):
        self.price = SIM_BASE_PRICE
        self.balance = SIM_BALANCE
        self.tick = 0
        self.candle_history_1m = []
        self.candle_history_3m = []
        self._build_initial_candles()

    def _build_initial_candles(self):
        """Pre-generate candle history with sweep patterns baked in."""
        p = self.price
        now = time.time()
        # Build 25 x 1m candles
        for i in range(25):
            o = p
            moves = [random.gauss(0, SIM_VOLATILITY * p) for _ in range(60)]
            prices = [o]
            for m in moves:
                prices.append(prices[-1] + m)
            h = max(prices)
            l = min(prices)
            c = prices[-1]
            self.candle_history_1m.append({
                "open": round(o, 4), "high": round(h, 4),
                "low": round(l, 4), "close": round(c, 4),
                "time": int((now - (25 - i) * 60) * 1000),
            })
            p = c

        # Inject a sweep candle as the last candle so first scan finds a signal
        recent_low = min(c["low"] for c in self.candle_history_1m[-12:-1])
        sweep_candle = {
            "open": round(p, 4),
            "high": round(p + 0.02, 4),
            "low": round(recent_low - 0.04, 4),   # wick below recent lows
            "close": round(p + 0.01, 4),           # close back above
            "time": int(now * 1000),
        }
        self.candle_history_1m.append(sweep_candle)
        p = sweep_candle["close"]

        # Build 3m candles from 1m data
        for i in range(0, len(self.candle_history_1m) - 2, 3):
            batch = self.candle_history_1m[i:i + 3]
            self.candle_history_3m.append({
                "open": batch[0]["open"],
                "high": round(max(c["high"] for c in batch), 4),
                "low": round(min(c["low"] for c in batch), 4),
                "close": batch[-1]["close"],
                "time": batch[0]["time"],
            })
        self.price = p

    def advance_tick(self):
        """Advance price by one tick (small random walk)."""
        self.tick += 1
        move = random.gauss(0, SIM_VOLATILITY * self.price)
        self.price = round(self.price + move, 4)
        if self.price < 1:
            self.price = 1.0

        # Every 3 ticks, generate a new 1m candle (frequent for sim speed)
        if self.tick % 3 == 0:
            self._generate_new_candle()

    def _generate_new_candle(self):
        """Generate a new 1m candle, sometimes with a liquidity sweep wick."""
        o = self.price
        inject_sweep = random.random() < 0.35  # 35% chance of sweep candle

        if inject_sweep:
            # Create a sweep candle: big wick in one direction, close back
            direction = random.choice(["down", "up"])
            if direction == "down":
                # Sweep below recent lows then recover
                recent_low = min(c["low"] for c in self.candle_history_1m[-10:])
                sweep_depth = recent_low - abs(random.gauss(0, 0.03))
                l = round(sweep_depth, 4)
                h = round(o + random.uniform(0, 0.02), 4)
                c = round(o + random.uniform(-0.01, 0.02), 4)  # close above sweep
                if c < recent_low:
                    c = round(recent_low + 0.005, 4)
            else:
                # Sweep above recent highs then dump back
                recent_high = max(c["high"] for c in self.candle_history_1m[-10:])
                sweep_height = recent_high + abs(random.gauss(0, 0.03))
                h = round(sweep_height, 4)
                l = round(o - random.uniform(0, 0.02), 4)
                c = round(o - random.uniform(-0.01, 0.02), 4)
                if c > recent_high:
                    c = round(recent_high - 0.005, 4)
        else:
            # Normal candle
            moves = [random.gauss(0, SIM_VOLATILITY * o) for _ in range(20)]
            prices = [o]
            for m in moves:
                prices.append(prices[-1] + m)
            h = round(max(prices), 4)
            l = round(min(prices), 4)
            c = round(prices[-1], 4)

        candle = {
            "open": round(o, 4), "high": h, "low": l, "close": c,
            "time": int(time.time() * 1000),
        }
        self.candle_history_1m.append(candle)
        if len(self.candle_history_1m) > 50:
            self.candle_history_1m = self.candle_history_1m[-50:]

        self.price = c

        # Aggregate to 3m candles every 3rd 1m candle
        if len(self.candle_history_1m) >= 3:
            last3 = self.candle_history_1m[-3:]
            if len(self.candle_history_3m) == 0 or \
               self.candle_history_1m[-1]["time"] - self.candle_history_3m[-1]["time"] > 170000:
                self.candle_history_3m.append({
                    "open": last3[0]["open"],
                    "high": round(max(x["high"] for x in last3), 4),
                    "low": round(min(x["low"] for x in last3), 4),
                    "close": last3[-1]["close"],
                    "time": last3[0]["time"],
                })
                if len(self.candle_history_3m) > 20:
                    self.candle_history_3m = self.candle_history_3m[-20:]

    def get_mid_price(self):
        return self.price

    def get_candles(self, interval, lookback):
        if interval == "1m":
            return list(self.candle_history_1m[-lookback:])
        else:
            return list(self.candle_history_3m[-lookback:])

    def get_balance(self):
        return self.balance

    def adjust_balance(self, pnl):
        self.balance += pnl


# --------------- TRADE LOG ---------------
def load_trade_log():
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            return json.load(f)
    return []


def save_trade_log(trades):
    with open(LOG_FILE, "w") as f:
        json.dump(trades, f, indent=2)


def append_trade(trade_record):
    trades = load_trade_log()
    trades.append(trade_record)
    save_trade_log(trades)
    log.info(
        f"TRADE LOG | #{trade_record['trade_num']} {trade_record['side'].upper()} "
        f"entry={trade_record['entry_price']:.4f} exit={trade_record['exit_price']:.4f} "
        f"pnl=${trade_record['pnl']:.4f} cumulative=${trade_record['cumulative_pnl']:.4f} "
        f"reason={trade_record['exit_reason']} duration={trade_record['duration_sec']}s"
    )


# --------------- MAIN BOT ---------------
class HypeLiquiditySweepScalper:
    def __init__(self):
        self.simulate = SIMULATE
        self.sim_market = None

        if self.simulate:
            log.info("Running in SIMULATION mode (HL_SIMULATE=true)")
            self.sim_market = SimulatedMarket()
            self.paper_mode = True
        else:
            self.secret_key = os.environ.get("HL_SECRET_KEY", "")
            self.wallet_address = os.environ.get("HL_WALLET_ADDRESS", "")
            self.use_testnet = os.environ.get("HL_TESTNET", "false").lower() == "true"
            if not self.secret_key or not self.wallet_address:
                log.warning("HL_SECRET_KEY / HL_WALLET_ADDRESS not set — running in PAPER mode")
                self.paper_mode = True
            else:
                self.paper_mode = False
            base_url = constants.TESTNET_API_URL if self.use_testnet else constants.MAINNET_API_URL
            self.info = Info(base_url, skip_ws=True)
            if not self.paper_mode:
                self.exchange = Exchange(
                    self.secret_key, base_url,
                    account_address=self.wallet_address,
                )
            else:
                self.exchange = None

        self.in_position = False
        self.position_side = None
        self.entry_price = 0.0
        self.entry_time = 0.0
        self.position_size = 0.0
        self.last_close_time = 0.0
        self.trade_count = 0
        self.cumulative_pnl = 0.0
        # Simulated clock tracks virtual elapsed time
        self.sim_clock = 0.0

    # ---------- TIME (sim-aware) ----------
    def sim_elapsed_since(self, ref_time):
        """Seconds elapsed since ref_time, accelerated in sim mode."""
        real_elapsed = time.time() - ref_time
        if self.simulate:
            return real_elapsed * SIM_TIME_FACTOR
        return real_elapsed

    # ---------- MARKET DATA ----------
    def get_mid_price(self, advance=True):
        if self.simulate:
            if advance:
                self.sim_market.advance_tick()
            return self.sim_market.get_mid_price()
        metas = self.info.all_mids()
        return float(metas[SYMBOL])

    def get_candles(self, interval="1m", lookback=20):
        if self.simulate:
            return self.sim_market.get_candles(interval, lookback)
        now_ms = int(time.time() * 1000)
        if interval == "1m":
            start_ms = now_ms - lookback * 60 * 1000
        else:
            start_ms = now_ms - lookback * 3 * 60 * 1000
        try:
            raw = self.info.candles_snapshot(SYMBOL, interval, start_ms, now_ms)
            return [
                {"open": float(c["o"]), "high": float(c["h"]),
                 "low": float(c["l"]), "close": float(c["c"]), "time": int(c["t"])}
                for c in raw
            ]
        except Exception as e:
            log.error(f"Candle fetch error ({interval}): {e}")
            return []

    def get_available_margin(self):
        if self.simulate:
            return self.sim_market.get_balance()
        if self.paper_mode:
            return 1000.0
        try:
            state = self.info.user_state(self.wallet_address)
            return float(state["marginSummary"]["accountValue"])
        except Exception as e:
            log.error(f"Margin fetch error: {e}")
            return 0.0

    # ---------- LIQUIDITY SWEEP DETECTION ----------
    def detect_sweep(self, candles, direction):
        if len(candles) < 5:
            return False, 0.0

        recent = candles[:-1]
        latest = candles[-1]
        candle_range = latest["high"] - latest["low"]
        if candle_range == 0:
            return False, 0.0

        if direction == "long":
            recent_low = min(c["low"] for c in recent[-10:])
            swept_below = latest["low"] < recent_low
            closed_above = latest["close"] > recent_low
            lower_wick = min(latest["open"], latest["close"]) - latest["low"]
            wick_ratio = lower_wick / candle_range
            if swept_below and closed_above and wick_ratio >= SWEEP_WICK_RATIO:
                return True, latest["close"]

        elif direction == "short":
            recent_high = max(c["high"] for c in recent[-10:])
            swept_above = latest["high"] > recent_high
            closed_below = latest["close"] < recent_high
            upper_wick = latest["high"] - max(latest["open"], latest["close"])
            wick_ratio = upper_wick / candle_range
            if swept_above and closed_below and wick_ratio >= SWEEP_WICK_RATIO:
                return True, latest["close"]

        return False, 0.0

    def scan_for_signal(self):
        """Scan 3m then 1m for liquidity sweep signals."""
        candles_3m = self.get_candles("3m", LOOKBACK_3M)
        if candles_3m:
            for direction in ["long", "short"]:
                hit, price = self.detect_sweep(candles_3m, direction)
                if hit:
                    log.info(f"3m sweep detected: {direction} @ {price:.4f}")
                    return direction, price

        candles_1m = self.get_candles("1m", LOOKBACK_1M)
        if candles_1m:
            for direction in ["long", "short"]:
                hit, price = self.detect_sweep(candles_1m, direction)
                if hit:
                    log.info(f"1m sweep detected: {direction} @ {price:.4f}")
                    return direction, price

        return None, 0.0

    # ---------- ORDER EXECUTION ----------
    def open_position(self, side, price):
        margin = self.get_available_margin()
        trade_margin = margin * MARGIN_PCT
        size = trade_margin / price
        size = round(size, 4)
        if size <= 0:
            log.warning("Calculated size <= 0, skipping")
            return False

        is_buy = side == "long"

        if not self.paper_mode and not self.simulate:
            try:
                result = self.exchange.market_open(SYMBOL, is_buy, size, None)
                log.info(f"Order result: {result}")
                if result.get("status") == "err":
                    log.error(f"Order failed: {result}")
                    return False
            except Exception as e:
                log.error(f"Order execution error: {e}")
                return False

        self.in_position = True
        self.position_side = side
        self.entry_price = price
        self.entry_time = time.time()
        self.position_size = size
        self.trade_count += 1

        tp = price * (1 + TP_PCT) if is_buy else price * (1 - TP_PCT)
        sl = price * (1 - SL_PCT) if is_buy else price * (1 + SL_PCT)
        log.info(
            f"OPENED #{self.trade_count} {side.upper()} | {size:.4f} HYPE @ ${price:.4f} | "
            f"margin=${trade_margin:.2f} | TP=${tp:.4f} SL=${sl:.4f}"
        )
        return True

    def close_position(self, current_price, reason="manual"):
        if not self.in_position:
            return

        if not self.paper_mode and not self.simulate:
            try:
                result = self.exchange.market_close(SYMBOL)
                log.info(f"Close result: {result}")
            except Exception as e:
                log.error(f"Close error: {e}")
                return

        if self.position_side == "long":
            pnl = (current_price - self.entry_price) * self.position_size
        else:
            pnl = (self.entry_price - current_price) * self.position_size

        self.cumulative_pnl += pnl

        if self.simulate:
            self.sim_market.adjust_balance(pnl)

        # Compute simulated duration
        real_duration = time.time() - self.entry_time
        sim_duration = real_duration * SIM_TIME_FACTOR if self.simulate else real_duration

        trade_record = {
            "trade_num": self.trade_count,
            "side": self.position_side,
            "entry_price": round(self.entry_price, 4),
            "exit_price": round(current_price, 4),
            "size": round(self.position_size, 4),
            "pnl": round(pnl, 4),
            "cumulative_pnl": round(self.cumulative_pnl, 4),
            "exit_reason": reason,
            "entry_time": datetime.fromtimestamp(self.entry_time, tz=timezone.utc).isoformat(),
            "exit_time": datetime.now(timezone.utc).isoformat(),
            "duration_sec": round(sim_duration, 1),
        }
        append_trade(trade_record)

        log.info(
            f"CLOSED #{self.trade_count} | pnl=${pnl:+.4f} | cumulative=${self.cumulative_pnl:+.4f} | "
            f"reason={reason} | held={sim_duration:.0f}s"
        )

        self.in_position = False
        self.position_side = None
        self.entry_price = 0.0
        self.position_size = 0.0
        self.last_close_time = time.time()

    def check_tp_sl(self):
        price = self.get_mid_price()
        if self.position_side == "long":
            if price >= self.entry_price * (1 + TP_PCT):
                self.close_position(price, "TP")
                return True
            if price <= self.entry_price * (1 - SL_PCT):
                self.close_position(price, "SL")
                return True
        elif self.position_side == "short":
            if price <= self.entry_price * (1 - TP_PCT):
                self.close_position(price, "TP")
                return True
            if price >= self.entry_price * (1 + SL_PCT):
                self.close_position(price, "SL")
                return True
        return False

    # ---------- MAIN LOOP ----------
    def run(self):
        log.info("=" * 60)
        log.info("HYPE/USDC Liquidity Sweep Scalper")
        log.info(f"Mode: {'SIMULATION' if self.simulate else 'PAPER' if self.paper_mode else 'LIVE'}")
        log.info(f"Pair: {SYMBOL}/USDC | Timeframes: 1m, 3m")
        log.info(f"TP: {TP_PCT*100}% | SL: {SL_PCT*100}% | Margin: {MARGIN_PCT*100}%")
        log.info(f"Min cooldown: {MIN_WAIT_SEC}s between trades")
        if self.simulate:
            log.info(f"Sim time factor: {SIM_TIME_FACTOR}x (1 real sec = {SIM_TIME_FACTOR} sim sec)")
        log.info("=" * 60)

        mid = self.get_mid_price()
        margin = self.get_available_margin()
        log.info(f"HYPE price: ${mid:.4f} | Available margin: ${margin:.2f}")

        while True:
            try:
                if self.in_position:
                    closed = self.check_tp_sl()
                    if closed:
                        log.info("Position closed — looking for next entry...")
                        continue
                    # In sim, sleep less since time is compressed
                    time.sleep(0.5 if self.simulate else 2)
                else:
                    # Cooldown between trades
                    sim_elapsed = self.sim_elapsed_since(self.last_close_time)
                    if self.last_close_time > 0 and sim_elapsed < MIN_WAIT_SEC:
                        remaining = MIN_WAIT_SEC - sim_elapsed
                        if self.simulate:
                            log.info(f"Cooldown: {remaining:.0f}s sim-time remaining")
                            time.sleep(1)
                        else:
                            log.info(f"Cooldown: {remaining:.0f}s remaining")
                            time.sleep(min(remaining, 15))
                        continue

                    # Scan for signal
                    side, price = self.scan_for_signal()
                    if side:
                        current_price = self.get_mid_price(advance=False)
                        success = self.open_position(side, current_price)
                        if success:
                            continue

                    time.sleep(0.5 if self.simulate else 10)

            except KeyboardInterrupt:
                log.info("Shutting down...")
                if self.in_position:
                    price = self.get_mid_price()
                    self.close_position(price, "shutdown")
                break
            except Exception as e:
                log.error(f"Loop error: {e}")
                time.sleep(1 if self.simulate else 5)

        log.info("=" * 60)
        log.info(f"SESSION SUMMARY | Trades: {self.trade_count} | Total PnL: ${self.cumulative_pnl:+.4f}")
        log.info("=" * 60)


if __name__ == "__main__":
    # Clear old logs on fresh start
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    if TEXT_LOG.exists():
        TEXT_LOG.unlink()

    bot = HypeLiquiditySweepScalper()
    bot.run()
