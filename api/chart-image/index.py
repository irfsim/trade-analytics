from http.server import BaseHTTPRequestHandler
import json
import io
import base64
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta

import yfinance as yf
import mplfinance as mpf
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
import numpy as np


# Custom style matching the app's dark theme
CHART_STYLE = {
    'base_mpl_style': 'dark_background',
    'marketcolors': {
        'candle': {'up': '#10b981', 'down': '#ef4444'},
        'edge': {'up': '#10b981', 'down': '#ef4444'},
        'wick': {'up': '#10b981', 'down': '#ef4444'},
        'ohlc': {'up': '#10b981', 'down': '#ef4444'},
        'volume': {'up': '#10b98150', 'down': '#ef444450'},
        'vcedge': {'up': '#10b981', 'down': '#ef4444'},
        'vcdopcod': False,
        'alpha': 1.0,
    },
    'mavcolors': ['#3b82f6', '#f59e0b', '#8b5cf6'],
    'facecolor': '#18181b',
    'edgecolor': '#27272a',
    'figcolor': '#18181b',
    'gridcolor': '#27272a',
    'gridstyle': '-',
    'gridwidth': 0.5,
    'y_on_right': True,
    'rc': {
        'axes.labelcolor': '#a1a1aa',
        'axes.edgecolor': '#27272a',
        'xtick.color': '#a1a1aa',
        'ytick.color': '#a1a1aa',
        'font.size': 9,
    },
}


def create_custom_style():
    """Create mplfinance style from our config."""
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
        gridwidth=0.5,
        y_on_right=True,
        rc={
            'axes.labelcolor': '#a1a1aa',
            'axes.edgecolor': '#27272a',
            'xtick.color': '#a1a1aa',
            'ytick.color': '#a1a1aa',
            'font.size': 9,
        },
    )


def fetch_data(ticker: str, start_date: str, end_date: str, interval: str = '1d') -> pd.DataFrame:
    """Fetch OHLCV data from Yahoo Finance."""
    # Add padding to dates
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else datetime.now()

    # Padding based on interval
    if interval == '1d':
        start = start - timedelta(days=30)
        end = end + timedelta(days=5)
    elif interval == '1h':
        start = start - timedelta(days=5)
        end = end + timedelta(days=1)
    else:  # 5m
        start = start - timedelta(days=1)
        end = end + timedelta(days=1)

    # Yahoo Finance interval mapping
    yf_interval = {'1d': '1d', '1h': '1h', '5m': '5m'}.get(interval, '1d')

    data = yf.download(
        ticker,
        start=start.strftime('%Y-%m-%d'),
        end=end.strftime('%Y-%m-%d'),
        interval=yf_interval,
        progress=False,
    )

    return data


def generate_chart(
    ticker: str,
    data: pd.DataFrame,
    legs: list,
    entry_price: float,
    exit_price: float | None,
    direction: str,
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
    ax_volume = axes[2] if len(axes) > 2 else None

    # Add entry/exit price lines
    ax_price.axhline(
        y=entry_price,
        color='#10b981',
        linestyle='--',
        linewidth=1,
        alpha=0.8,
        label=f'Entry ${entry_price:.2f}',
    )

    if exit_price:
        is_profit = (exit_price > entry_price) if direction == 'LONG' else (exit_price < entry_price)
        ax_price.axhline(
            y=exit_price,
            color='#10b981' if is_profit else '#ef4444',
            linestyle='--',
            linewidth=1,
            alpha=0.8,
            label=f'Exit ${exit_price:.2f}',
        )

    # Add trade markers
    for leg in legs:
        try:
            leg_date = pd.Timestamp(leg['executed_at']).tz_localize(None)
            # Find nearest date in data
            idx = data.index.get_indexer([leg_date], method='nearest')[0]
            if 0 <= idx < len(data):
                x_pos = idx
                y_pos = leg['price']

                is_buy = leg['leg_type'] in ['ENTRY', 'ADD']
                marker = '^' if is_buy else 'v'
                color = '#10b981' if leg['leg_type'] == 'ENTRY' else '#3b82f6' if leg['leg_type'] == 'ADD' else '#f59e0b' if leg['leg_type'] == 'TRIM' else '#ef4444'

                ax_price.scatter(
                    x_pos,
                    y_pos,
                    marker=marker,
                    color=color,
                    s=100,
                    zorder=5,
                    edgecolors='white',
                    linewidths=0.5,
                )
        except Exception:
            continue

    # Add title
    ax_price.set_title(f'{ticker} - Daily', color='#a1a1aa', fontsize=11, loc='left', pad=10)

    # Save to bytes
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#18181b', edgecolor='none')
    buf.seek(0)
    plt.close(fig)

    return buf.getvalue()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse URL
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Extract parameters
            ticker = params.get('ticker', ['AAPL'])[0]
            interval = params.get('interval', ['1d'])[0]
            from_date = params.get('from', [None])[0]
            to_date = params.get('to', [None])[0]
            entry_price = float(params.get('entry', [0])[0])
            exit_price = params.get('exit', [None])[0]
            exit_price = float(exit_price) if exit_price else None
            direction = params.get('direction', ['LONG'])[0]

            # Parse legs from JSON
            legs_json = params.get('legs', ['[]'])[0]
            legs = json.loads(legs_json)

            # Fetch data
            data = fetch_data(ticker, from_date, to_date, interval)

            # Generate chart
            image_bytes = generate_chart(
                ticker=ticker,
                data=data,
                legs=legs,
                entry_price=entry_price,
                exit_price=exit_price,
                direction=direction,
            )

            # Return image
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Cache-Control', 'public, max-age=300')
            self.end_headers()
            self.wfile.write(image_bytes)

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
