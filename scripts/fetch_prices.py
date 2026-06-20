"""
每日盤後價格抓取腳本
從 Supabase 讀取所有 positions 的 symbol，抓取最新收盤價，寫回 prices 表。
"""

import os
import sys
from datetime import datetime, timezone

import requests
import yfinance as yf
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

EXCHANGE_SUFFIX: dict[str, str] = {
    "jp_stock": ".T",
    "hk_stock": ".HK",
    "us_stock": "",
}

POSITION_CURRENCY: dict[str, str] = {
    "tw_stock": "TWD",
    "us_stock": "USD",
    "jp_stock": "JPY",
    "hk_stock": "HKD",
}

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "Mozilla/5.0"})


def fetch_tw_stock_price(symbol: str) -> tuple[float, str] | None:
    """使用 TWSE 官方 API 抓台股收盤價（不受 CORS / rate-limit 限制）"""
    try:
        url = f"https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo={symbol}&response=json"
        res = _SESSION.get(url, timeout=15)
        if not res.ok:
            return None
        data = res.json()
        if data.get("stat") != "OK" or not data.get("data"):
            # 可能是 OTC（上櫃）股票，改試 TPEX
            return fetch_tpex_price(symbol)
        # fields: 日期、成交股數、成交金額、開盤價、最高價、最低價、收盤價、漲跌、筆數
        close_price = float(data["data"][-1][6].replace(",", ""))
        return close_price, "TWD"
    except Exception as e:
        print(f"    TWSE error ({symbol}): {e}", file=sys.stderr)
        return None


def fetch_tpex_price(symbol: str) -> tuple[float, str] | None:
    """上櫃股票用 TPEX API"""
    try:
        url = f"https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
        res = _SESSION.get(url, timeout=15)
        if not res.ok:
            return None
        rows = res.json()
        for row in rows:
            if row.get("SecuritiesCompanyCode") == symbol:
                price = float(row["Close"].replace(",", ""))
                return price, "TWD"
    except Exception as e:
        print(f"    TPEX error ({symbol}): {e}", file=sys.stderr)
    return None


def fetch_yf_price(symbol: str, position_type: str) -> tuple[float, str] | None:
    suffix = EXCHANGE_SUFFIX.get(position_type, "")
    ticker_str = f"{symbol}{suffix}"
    try:
        hist = yf.Ticker(ticker_str).history(period="5d")
        if hist.empty:
            return None
        price = float(hist["Close"].iloc[-1])
        currency = POSITION_CURRENCY.get(position_type, "USD")
        return price, currency
    except Exception as e:
        print(f"    yfinance error ({ticker_str}): {e}", file=sys.stderr)
        return None


def fetch_crypto_price(symbol: str) -> tuple[float, str] | None:
    try:
        url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol.upper()}USDT"
        res = _SESSION.get(url, timeout=10)
        if res.ok:
            return float(res.json()["price"]), "USD"
    except Exception as e:
        print(f"    Binance error ({symbol}): {e}", file=sys.stderr)
    return None


def main() -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # 取得所有 positions 的 symbol + type（跨所有使用者）
    rows = supabase.from_("positions").select("symbol, type").execute().data
    if not rows:
        print("No positions found, nothing to do.")
        return

    # 去重，同一 symbol 取第一個出現的 type
    symbol_type: dict[str, str] = {}
    for row in rows:
        symbol_type.setdefault(row["symbol"], row["type"])

    print(f"Fetching prices for {len(symbol_type)} symbol(s)...")

    upserts = []
    failed = []
    for symbol, pos_type in symbol_type.items():
        print(f"  {symbol:10s} ({pos_type}) ... ", end="", flush=True)

        if pos_type == "crypto":
            result = fetch_crypto_price(symbol)
        elif pos_type == "tw_stock":
            result = fetch_tw_stock_price(symbol)
        else:
            result = fetch_yf_price(symbol, pos_type)

        if result:
            price, currency = result
            print(f"{price:,.4f} {currency}")
            upserts.append({
                "symbol": symbol,
                "price": price,
                "currency": currency,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            print("FAILED")
            failed.append(symbol)

    if upserts:
        supabase.from_("prices").upsert(upserts).execute()
        print(f"\nUpserted {len(upserts)} price(s).")

    if failed:
        print(f"Failed: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
