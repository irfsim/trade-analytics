export type ChartInterval = '1d' | '1h' | '5m';

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  ticker: string;
  interval: string;
  candles: ChartCandle[];
  meta: {
    currency: string;
    exchangeName: string;
    regularMarketPrice?: number;
  };
}
