# wine.ai

Local wine recommendation app powered by taste intelligence.

Searches 371 wines across 3 stores near Baldwinsville, NY using natural language — "smooth red under $20", "crisp white for seafood", "bold cabernet".

## How it works

- 7-dimensional flavor vectors (tannin, acidity, sweetness, body, fruit, oak, spice) for every wine
- Natural language parsing extracts taste preferences, grape, price, region filters
- Inverse Euclidean distance scoring ranks wines by vector proximity to your preference
- All client-side — no API calls, no server

## Stores

- Pascale's Liquors (Liverpool, NY)
- Liquor Express (North Syracuse, NY)
- Peter's Discount Liquors (Syracuse, NY)

## Dev

```bash
# Serve locally (ES modules need a server)
npx serve .
# or
python3 -m http.server 8000
```

## Deploy

Connected to Vercel for auto-deploy from GitHub.
