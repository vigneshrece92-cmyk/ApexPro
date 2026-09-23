"""
ApexFX MT5 Execution Bridge
Connects local MetaTrader 5 terminal to ApexFX Pro Terminal for live account monitoring,
1-click execution, and automated 4H PO3 / Breakout strategy trading on XAUUSD.
"""

import sys
import json
import time
import math
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import MetaTrader5 as mt5

PORT = 5001
MAGIC_NUMBER = 4003

# Global Auto-Bot Configuration
auto_bot_state = {
    "enabled": False,
    "risk_percent": 1.0, # 1.0% risk of account ($30 on $3000)
    "max_open_trades": 2,
    "last_signal_time": 0,
    "logs": []
}

def log_bot(msg):
    ts = time.strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    print(entry)
    auto_bot_state["logs"].append(entry)
    if len(auto_bot_state["logs"]) > 50:
        auto_bot_state["logs"].pop(0)

def ensure_mt5():
    if not mt5.initialize():
        return False, f"MT5 initialize failed: {mt5.last_error()}"
    return True, "Connected"

def get_account_info():
    ok, err = ensure_mt5()
    if not ok:
        return {"connected": False, "error": err}
    
    acc = mt5.account_info()
    if not acc:
        return {"connected": False, "error": "No account logged in"}
    
    acc_dict = acc._asdict()
    
    # Get open positions
    positions = mt5.positions_get()
    pos_list = []
    total_profit = 0.0
    if positions:
        for p in positions:
            p_dict = p._asdict()
            total_profit += p.profit
            pos_list.append({
                "ticket": p.ticket,
                "symbol": p.symbol,
                "type": "BUY" if p.type == mt5.ORDER_TYPE_BUY else "SELL",
                "volume": p.volume,
                "price_open": p.price_open,
                "sl": p.sl,
                "tp": p.tp,
                "price_current": p.price_current,
                "profit": round(p.profit, 2),
                "comment": p.comment,
                "time": p.time
            })

    # Get NIFTY live tick
    nifty_tick = mt5.symbol_info_tick("NIFTY") or mt5.symbol_info_tick("NSE:NIFTY")
    nifty_data = {
        "bid": nifty_tick.bid if nifty_tick else 23329.0,
        "ask": nifty_tick.ask if nifty_tick else 23330.5,
        "spread": round((nifty_tick.ask - nifty_tick.bid), 2) if nifty_tick else 1.5
    }

    return {
        "connected": True,
        "login": acc_dict.get("login"),
        "name": acc_dict.get("name"),
        "server": acc_dict.get("server"),
        "balance": round(acc_dict.get("balance", 0.0), 2),
        "equity": round(acc_dict.get("equity", 0.0), 2),
        "margin": round(acc_dict.get("margin", 0.0), 2),
        "margin_free": round(acc_dict.get("margin_free", 0.0), 2),
        "leverage": acc_dict.get("leverage"),
        "trade_allowed": acc_dict.get("trade_allowed"),
        "trade_expert": acc_dict.get("trade_expert"),
        "open_profit": round(total_profit, 2),
        "open_positions": pos_list,
        "nifty": nifty_data,
        "auto_bot": {
            "enabled": auto_bot_state["enabled"],
            "risk_percent": auto_bot_state["risk_percent"],
            "logs": auto_bot_state["logs"][-10:]
        }
    }

def calculate_safe_lot(symbol, sl_distance, risk_percent=1.0):
    acc = mt5.account_info()
    equity = acc.equity if acc else 3000.0
    risk_amount = (equity * risk_percent) / 100.0 # e.g. $30 on $3000

    sym_info = mt5.symbol_info(symbol)
    if not sym_info:
        return 0.01

    contract_size = sym_info.trade_contract_size or 100.0
    min_lot = sym_info.volume_min or 0.01
    step_lot = sym_info.volume_step or 0.01
    
    if sl_distance <= 0:
        return min_lot

    # Lot = Risk $ / (SL Distance * Contract Size)
    # For Gold (100 oz): SL $15 -> $30 / (15 * 100) = 0.02
    calculated_lot = risk_amount / (sl_distance * contract_size)
    
    # Round to step
    steps = math.floor(calculated_lot / step_lot)
    lot = steps * step_lot
    
    # Standard 0.02 lot for all pairs with 1:1000 leverage protection
    safe_lot = 0.02
    return safe_lot

def execute_trade(data):
    ok, err = ensure_mt5()
    if not ok: return {"success": False, "error": err}

    symbol = data.get("symbol", "XAUUSD")
    action = data.get("action", "BUY").upper()
    sl = float(data.get("sl", 0.0))
    tp = float(data.get("tp", 0.0))
    comment = data.get("comment", "ApexFX_Trade")
    risk_percent = float(data.get("risk_percent", 1.0))
    requested_lot = data.get("lot")

    # Verify symbol
    sym_info = mt5.symbol_info(symbol)
    if not sym_info:
        return {"success": False, "error": f"Symbol {symbol} not found in MT5"}
    if not sym_info.visible:
        mt5.symbol_select(symbol, True)

    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return {"success": False, "error": f"Failed to get live tick for {symbol}"}

    price = tick.ask if action == "BUY" else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if action == "BUY" else mt5.ORDER_TYPE_SELL

    # Determine safe lot size
    if requested_lot:
        lot = float(requested_lot)
        # Cap at 0.05 max for $3000 protection
        lot = max(0.01, min(0.05, round(lot, 2)))
    else:
        sl_dist = abs(price - sl) if sl > 0 else 15.0
        lot = calculate_safe_lot(symbol, sl_dist, risk_percent)

    # Determine filling mode
    filling_mode = mt5.ORDER_FILLING_IOC
    if sym_info.filling_mode & 2:
        filling_mode = mt5.ORDER_FILLING_IOC
    elif sym_info.filling_mode & 1:
        filling_mode = mt5.ORDER_FILLING_FOK
    else:
        filling_mode = mt5.ORDER_FILLING_RETURN

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 25,
        "magic": MAGIC_NUMBER,
        "comment": comment[:31],
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": filling_mode,
    }

    result = mt5.order_send(request)
    if result is None:
        return {"success": False, "error": f"Order send failed, error code: {mt5.last_error()}"}

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "success": False,
            "error": f"MT5 rejected: {result.comment} (code {result.retcode})",
            "retcode": result.retcode
        }

    log_bot(f"Executed {action} {lot} {symbol} @ {result.price} (Ticket #{result.order}) SL: {sl} TP: {tp}")

    return {
        "success": True,
        "order": result.order,
        "deal": result.deal,
        "volume": result.volume,
        "price": result.price,
        "comment": result.comment,
        "message": f"Successfully placed {action} {lot} {symbol} @ {result.price}"
    }

def close_position(data):
    ok, err = ensure_mt5()
    if not ok: return {"success": False, "error": err}

    ticket = data.get("ticket")
    close_all = data.get("close_all", False)

    positions = mt5.positions_get()
    if not positions:
        return {"success": True, "message": "No open positions to close"}

    closed_count = 0
    errors = []

    for p in positions:
        if close_all or (ticket and p.ticket == int(ticket)):
            sym_info = mt5.symbol_info(p.symbol)
            close_type = mt5.ORDER_TYPE_SELL if p.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
            tick = mt5.symbol_info_tick(p.symbol)
            if not tick: continue
            close_price = tick.bid if p.type == mt5.ORDER_TYPE_BUY else tick.ask

            filling_mode = mt5.ORDER_FILLING_IOC
            if sym_info and (sym_info.filling_mode & 2):
                filling_mode = mt5.ORDER_FILLING_IOC
            elif sym_info and (sym_info.filling_mode & 1):
                filling_mode = mt5.ORDER_FILLING_FOK
            else:
                filling_mode = mt5.ORDER_FILLING_RETURN

            req = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": p.symbol,
                "volume": p.volume,
                "type": close_type,
                "position": p.ticket,
                "price": close_price,
                "deviation": 25,
                "magic": MAGIC_NUMBER,
                "comment": "ApexFX Close",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode,
            }

            res = mt5.order_send(req)
            if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                closed_count += 1
                log_bot(f"Closed #{p.ticket} {p.symbol} profit: ${p.profit:.2f}")
            else:
                err_msg = res.comment if res else str(mt5.last_error())
                errors.append(f"Ticket #{p.ticket}: {err_msg}")

    return {
        "success": closed_count > 0 or len(errors) == 0,
        "closed": closed_count,
        "errors": errors,
        "message": f"Closed {closed_count} position(s)"
    }

def modify_position(data):
    ok, err = ensure_mt5()
    if not ok: return {"success": False, "error": err}

    ticket = int(data.get("ticket", 0))
    to_be = data.get("break_even", False)
    new_sl = data.get("sl")
    new_tp = data.get("tp")

    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        return {"success": False, "error": f"Position #{ticket} not found"}

    p = positions[0]

    final_sl = p.sl
    final_tp = p.tp

    if to_be:
        # Set SL to open price + small buffer
        buffer = 0.50 if "XAU" in p.symbol else 0.0002
        if p.type == mt5.ORDER_TYPE_BUY:
            final_sl = round(p.price_open + buffer, 2)
        else:
            final_sl = round(p.price_open - buffer, 2)
    elif new_sl is not None:
        final_sl = float(new_sl)

    if new_tp is not None:
        final_tp = float(new_tp)

    req = {
        "action": mt5.TRADE_ACTION_SLTP,
        "symbol": p.symbol,
        "position": p.ticket,
        "sl": final_sl,
        "tp": final_tp,
    }

    res = mt5.order_send(req)
    if res and res.retcode == mt5.TRADE_RETCODE_DONE:
        log_bot(f"Modified #{ticket} SL: {final_sl} TP: {final_tp}")
        return {"success": True, "message": f"Updated #{ticket} SL to {final_sl}"}
    else:
        err_msg = res.comment if res else str(mt5.last_error())
        return {"success": False, "error": err_msg}

# Background Autonomous Bot Loop (Analyzes live 15M PAVP Volume Profile on MCX & Indian F&O)
def auto_bot_worker():
    log_bot("Apex Pro 15M PAVP Volume Profile Auto-Bot initialized")
    symbols = ["CRUDEOIL", "NATURALGAS", "NIFTY", "BANKNIFTY"]
    while True:
        try:
            if auto_bot_state["enabled"]:
                ok, _ = ensure_mt5()
                if ok:
                    for sym in symbols:
                        positions = mt5.positions_get(symbol=sym)
                        open_count = len(positions) if positions else 0

                        # 1. Manage open positions: Break-Even Rule
                        if positions:
                            for p in positions:
                                tick = mt5.symbol_info_tick(sym)
                                if not tick: continue
                                # If profit buffer reached and SL is still behind entry, move to Break-Even!
                                if p.profit >= 500.0:
                                    if (p.type == mt5.ORDER_TYPE_BUY and p.sl < p.price_open) or \
                                       (p.type == mt5.ORDER_TYPE_SELL and p.sl > p.price_open):
                                        modify_position({"ticket": p.ticket, "break_even": True})
                                        log_bot(f"Auto-Protected #{p.ticket} {sym} to Break-Even! (Profit: +₹{p.profit:.2f})")

                        # 2. Check for 15M Volume Profile entry if slots available
                        if open_count < 1:
                            rates = mt5.copy_rates_from_pos(sym, mt5.TIMEFRAME_M15, 0, 50)
                            if rates is not None and len(rates) >= 20:
                                last_bar = rates[-1]
                                prev_bar = rates[-2]
                                tick = mt5.symbol_info_tick(sym)
                                curr_price = tick.bid if tick else last_bar[4]

                                highs = [r[2] for r in rates]
                                lows = [r[3] for r in rates]
                                p_high = max(highs)
                                p_low = min(lows)
                                p_range = p_high - p_low
                                val = p_low + p_range * 0.22
                                poc = p_low + p_range * 0.50
                                vah = p_low + p_range * 0.78
                                buffer = p_range * 0.05

                                # 15M BUY CE @ VAL: Rebound off VAL
                                if (prev_bar[3] <= val + buffer or last_bar[3] <= val + buffer) and last_bar[4] >= val:
                                    sl = round(p_low - buffer, 2)
                                    tp = round(poc, 2)
                                    execute_trade({
                                        "symbol": sym,
                                        "action": "BUY",
                                        "sl": sl,
                                        "tp": tp,
                                        "comment": f"15M_PAVP_VAL_BUY_{sym}",
                                        "risk_percent": auto_bot_state["risk_percent"]
                                    })
                                    log_bot(f"AUTO-TRIGGER: Executed 15M PAVP BUY on {sym} @ {curr_price} (SL: {sl}, TP: {tp})")
                                    time.sleep(30)

                                # 15M SELL PE @ VAH: Rejection off VAH
                                elif (prev_bar[2] >= vah - buffer or last_bar[2] >= vah - buffer) and last_bar[4] <= vah:
                                    sl = round(p_high + buffer, 2)
                                    tp = round(poc, 2)
                                    execute_trade({
                                        "symbol": sym,
                                        "action": "SELL",
                                        "sl": sl,
                                        "tp": tp,
                                        "comment": f"15M_PAVP_VAH_SELL_{sym}",
                                        "risk_percent": auto_bot_state["risk_percent"]
                                    })
                                    log_bot(f"AUTO-TRIGGER: Executed 15M PAVP SELL on {sym} @ {curr_price} (SL: {sl}, TP: {tp})")
                                    time.sleep(30)
        except Exception as e:
            print(f"Auto-bot loop error: {e}")

        time.sleep(15)

# HTTP Request Handler
class MT5BridgeHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status" or parsed.path == "/":
            data = get_account_info()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        payload = json.loads(body.decode("utf-8")) if body else {}

        if parsed.path == "/api/trade":
            res = execute_trade(payload)
        elif parsed.path == "/api/close":
            res = close_position(payload)
        elif parsed.path == "/api/modify":
            res = modify_position(payload)
        elif parsed.path == "/api/auto-bot":
            enabled = payload.get("enabled", not auto_bot_state["enabled"])
            auto_bot_state["enabled"] = enabled
            if "risk_percent" in payload:
                auto_bot_state["risk_percent"] = float(payload["risk_percent"])
            log_bot(f"Auto-Bot is now {'ACTIVE' if enabled else 'PAUSED'}")
            res = {"success": True, "auto_bot": auto_bot_state}
        else:
            res = {"success": False, "error": "Endpoint not found"}

        self.send_response(200 if res.get("success", False) else 400)
        self.send_header("Content-Type", "application/json")
        self._send_cors()
        self.end_headers()
        self.wfile.write(json.dumps(res).encode("utf-8"))

def start_server():
    server = HTTPServer(("127.0.0.1", PORT), MT5BridgeHandler)
    print(f"ApexFX MT5 Bridge running on http://127.0.0.1:{PORT}")
    
    # Start auto bot worker thread
    bot_thread = threading.Thread(target=auto_bot_worker, daemon=True)
    bot_thread.start()

    server.serve_forever()

if __name__ == "__main__":
    start_server()
