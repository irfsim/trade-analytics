#!/usr/bin/env python3
"""
Local development server for chart image generation.
Run this alongside Next.js dev server for local chart testing.

Usage: python3 scripts/chart-server.py
Server runs on http://localhost:3002
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import io
import os
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
from typing import Optional, List

import yfinance as yf
import mplfinance as mpf
import matplotlib.pyplot as plt
import pandas as pd

# Try to import supabase for cache support
try:
    from supabase import create_client
    SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ Supabase cache enabled")
    else:
        supabase = None
        print("⚠ Supabase not configured - cache disabled")
except ImportError:
    supabase = None
    print("⚠ Supabase package not installed - run: pip install supabase")


# Cache padding (must match TypeScript side)
CACHE_PADDING = {
    '5m': {'before': 24 * 60 * 60, 'after': 2 * 60 * 60},  # 1 day before, 2 hours after
    '1h': {'before': 2 * 24 * 60 * 60, 'after': 2 * 24 * 60 * 60},  # 2 days each
}


def fetch_from_cache(ticker: str, interval: str, entry_date: datetime, exit_date: datetime) -> Optional[pd.DataFrame]:
    """Try to fetch chart data from Supabase cache."""
    if not supabase or interval not in CACHE_PADDING:
        return None

    padding = CACHE_PADDING[interval]
    start_date = entry_date - timedelta(seconds=padding['before'])
    end_date = exit_date + timedelta(seconds=padding['after'])

    try:
        result = supabase.table('chart_cache').select('candles').eq(
            'ticker', ticker
        ).eq(
            'interval', interval
        ).eq(
            'start_date', start_date.isoformat()
        ).eq(
            'end_date', end_date.isoformat()
        ).single().execute()

        if result.data and result.data.get('candles'):
            candles = result.data['candles']
            print(f"[Cache] Using cached data for {ticker} {interval}: {len(candles)} candles")

            # Convert to DataFrame
            df = pd.DataFrame(candles)
            df['time'] = pd.to_datetime(df['time'])
            df.set_index('time', inplace=True)
            df.rename(columns={
                'open': 'Open',
                'high': 'High',
                'low': 'Low',
                'close': 'Close',
                'volume': 'Volume'
            }, inplace=True)

            return df
    except Exception as e:
        print(f"[Cache] Cache miss or error: {e}")

    return None


def create_custom_style():
    """Create mplfinance style matching the app's dark theme."""
    mc = mpf.make_marketcolors(
        up='#10b981',
        down='#ef4444',
        edge={'up': '#10b981', 'down': '#ef4444'},
        wick={'up': '#10b981', 'down': '#ef4444'},
        volume={'up': '#10b98150', 'down': '#ef444450'},
    )
    return mpf.make_mpf_style(
        base_mpl_style='dark_background',
        marketcolors=mc,
        facecolor='#18181b',
        edgecolor='#27272a',
        figcolor='#18181b',
        gridcolor='#27272a',
        gridstyle='-',
        y_on_right=True,
        rc={
            'axes.labelcolor': '#a1a1aa',
            'axes.edgecolor': '#27272a',
            'xtick.color': '#a1a1aa',
            'ytick.color': '#a1a1aa',
            'font.size': 9,
            'grid.linewidth': 0.5,
        },
    )


def fetch_data(ticker: str, start_date: str, end_date: str, interval: str = '1d') -> pd.DataFrame:
    """Fetch OHLCV data from Yahoo Finance, checking cache first for intraday data."""
    try:
        entry_date = datetime.fromisoformat(start_date.replace('Z', '+00:00').replace('+00:00', ''))
    except:
        entry_date = datetime.now() - timedelta(days=60)

    try:
        exit_date = datetime.fromisoformat(end_date.replace('Z', '+00:00').replace('+00:00', '')) if end_date else datetime.now()
    except:
        exit_date = datetime.now()

    # For intraday intervals, check cache first
    if interval in ('5m', '1h'):
        cached_data = fetch_from_cache(ticker, interval, entry_date, exit_date)
        if cached_data is not None and not cached_data.empty:
            print(f"[Cache] Using cached data for {ticker} {interval}")
            return cached_data
        else:
            print(f"[Cache] No cached data for {ticker} {interval}, falling back to Yahoo Finance")

    # Calculate display padding (different from cache padding - this is for chart aesthetics)
    start = entry_date
    end = exit_date
    if interval == '1d':
        start = start - timedelta(days=30)
        end = end + timedelta(days=10)
    elif interval == '1h':
        start = start - timedelta(days=5)
        end = end + timedelta(days=3)
    else:  # 5m
        start = start - timedelta(hours=4)  # 4 hours before to show setup context
        end = end + timedelta(hours=2)

    # Handle date clamping - ensure we don't request future data
    now = datetime.now()
    if end > now:
        end = now
    # If start is also in the future (dummy data), use recent data as fallback
    if start > now:
        if interval == '1d':
            start = now - timedelta(days=60)
        elif interval == '1h':
            start = now - timedelta(days=10)
        else:
            start = now - timedelta(days=3)

    yf_interval = {'1d': '1d', '1h': '1h', '5m': '5m'}.get(interval, '1d')

    data = yf.download(
        ticker,
        start=start.strftime('%Y-%m-%d'),
        end=end.strftime('%Y-%m-%d'),
        interval=yf_interval,
        progress=False,
    )

    # Flatten MultiIndex columns (yfinance returns ('Open', 'AAPL') format)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    return data


def generate_chart(
    ticker: str,
    data: pd.DataFrame,
    legs: List,
    entry_price: float,
    exit_price: Optional[float],
    direction: str,
    interval: str = '1d',
    width: int = 1200,
    height: int = 400,
) -> bytes:
    """Generate candlestick chart with trade markers."""

    if data.empty:
        raise ValueError("No data available")

    style = create_custom_style()

    # Create figure
    fig, axes = mpf.plot(
        data,
        type='candle',
        style=style,
        volume=True,
        returnfig=True,
        figsize=(width / 100, height / 100),
        tight_layout=True,
        warn_too_much_data=10000,
    )

    ax_price = axes[0]

    # Add entry price line
    ax_price.axhline(
        y=entry_price,
        color='#10b981',
        linestyle='--',
        linewidth=1,
        alpha=0.8,
    )

    # Add exit price line
    if exit_price:
        is_profit = (exit_price > entry_price) if direction == 'LONG' else (exit_price < entry_price)
        ax_price.axhline(
            y=exit_price,
            color='#10b981' if is_profit else '#ef4444',
            linestyle='--',
            linewidth=1,
            alpha=0.8,
        )

    # Add trade markers
    # Calculate offset for marker placement (4% of price range for better visibility)
    price_range = data['High'].max() - data['Low'].min()
    marker_offset = price_range * 0.04

    # Track used positions to offset overlapping markers horizontally
    used_positions = {}  # idx -> list of marker types at that position

    for leg in legs:
        try:
            leg_date_str = leg.get('executed_at', '')
            leg_date = pd.Timestamp(leg_date_str)

            # Handle timezone: make leg_date match data index timezone
            if data.index.tz is not None:
                # Data has timezone, localize leg_date if needed
                if leg_date.tz is None:
                    leg_date = leg_date.tz_localize('UTC').tz_convert(data.index.tz)
                else:
                    leg_date = leg_date.tz_convert(data.index.tz)
            else:
                # Data has no timezone, remove timezone from leg_date
                if leg_date.tz is not None:
                    leg_date = leg_date.tz_localize(None)

            # Find nearest date in data
            idx = data.index.get_indexer([leg_date], method='nearest')[0]
            if 0 <= idx < len(data):
                candle = data.iloc[idx]

                is_buy = leg.get('leg_type') in ['ENTRY', 'ADD']
                marker = '^' if is_buy else 'v'

                # Calculate horizontal offset for overlapping markers
                # Entry/Add markers go slightly left, Exit/Trim markers go slightly right
                marker_count = used_positions.get(idx, 0)
                if is_buy:
                    x_offset = -0.15 + (marker_count * 0.15)  # Buys start left
                else:
                    x_offset = 0.15 + (marker_count * 0.15)   # Sells start right
                used_positions[idx] = marker_count + 1
                x_pos = idx + x_offset

                # Place buy markers below candle low, sell markers above candle high
                if is_buy:
                    y_pos = candle['Low'] - marker_offset
                else:
                    y_pos = candle['High'] + marker_offset

                colors = {
                    'ENTRY': '#10b981',
                    'ADD': '#3b82f6',
                    'TRIM': '#f59e0b',
                    'EXIT': '#ef4444',
                }
                color = colors.get(leg.get('leg_type'), '#71717a')

                ax_price.scatter(
                    x_pos,
                    y_pos,
                    marker=marker,
                    color=color,
                    s=150,
                    zorder=5,
                    edgecolors='white',
                    linewidths=1,
                )
        except Exception as e:
            print(f"Error adding marker: {e}")
            continue

    # Expand y-axis to ensure markers are visible
    y_min, y_max = ax_price.get_ylim()
    data_low = data['Low'].min()
    data_high = data['High'].max()
    # Add 8% padding below for entry markers, 5% above for exit markers
    new_y_min = min(y_min, data_low - price_range * 0.08)
    new_y_max = max(y_max, data_high + price_range * 0.08)
    ax_price.set_ylim(new_y_min, new_y_max)

    # Add title
    interval_labels = {'1d': 'Daily', '1h': 'Hourly', '5m': '5 Min'}
    ax_price.set_title(
        f'{ticker} - {interval_labels.get(interval, interval)}',
        color='#a1a1aa',
        fontsize=11,
        loc='left',
        pad=10
    )

    # Save to bytes
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#18181b', edgecolor='none')
    buf.seek(0)
    plt.close(fig)

    return buf.getvalue()


class ChartHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Handle CORS preflight
        if self.path.startswith('/api/chart-image'):
            self.handle_chart_request()
        else:
            self.send_error(404)

    def handle_chart_request(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            ticker = params.get('ticker', ['AAPL'])[0]
            interval = params.get('interval', ['1d'])[0]
            from_date = params.get('from', [None])[0]
            to_date = params.get('to', [None])[0]
            entry_price = float(params.get('entry', ['0'])[0])
            exit_price = params.get('exit', [None])[0]
            exit_price = float(exit_price) if exit_price else None
            direction = params.get('direction', ['LONG'])[0]

            legs_json = params.get('legs', ['[]'])[0]
            legs = json.loads(legs_json)

            print(f"Generating chart for {ticker} ({interval})")

            data = fetch_data(ticker, from_date, to_date, interval)
            image_bytes = generate_chart(
                ticker=ticker,
                data=data,
                legs=legs,
                entry_price=entry_price,
                exit_price=exit_price,
                direction=direction,
                interval=interval,
            )

            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=300')
            self.end_headers()
            self.wfile.write(image_bytes)

        except Exception as e:
            print(f"Error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[Chart Server] {args[0]}")


if __name__ == '__main__':
    port = 3002
    server = HTTPServer(('localhost', port), ChartHandler)
    print(f"🎨 Chart server running at http://localhost:{port}")
    print(f"   Example: http://localhost:{port}/api/chart-image?ticker=AAPL&interval=1d&from=2026-01-01&entry=250")
    print(f"\n   Run this alongside 'npm run dev' for local chart testing")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Chart server stopped")
