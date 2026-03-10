-- Add product type fields to orders table for stencil_paint and glitter_reveal product types

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'paint_by_numbers'
    CHECK (product_type IN ('paint_by_numbers', 'stencil_paint', 'glitter_reveal')),
  ADD COLUMN IF NOT EXISTS stencil_detail_level TEXT NULL
    CHECK (stencil_detail_level IS NULL OR stencil_detail_level IN ('bold', 'medium', 'fine')),
  ADD COLUMN IF NOT EXISTS glitter_palette TEXT NULL
    CHECK (glitter_palette IS NULL OR glitter_palette IN ('mercury', 'mars', 'neptune', 'jupiter'));

-- Add product type fields to abandoned_carts table
ALTER TABLE abandoned_carts
  ADD COLUMN IF NOT EXISTS product_type TEXT NULL
    CHECK (product_type IS NULL OR product_type IN ('paint_by_numbers', 'stencil_paint', 'glitter_reveal')),
  ADD COLUMN IF NOT EXISTS stencil_detail_level TEXT NULL
    CHECK (stencil_detail_level IS NULL OR stencil_detail_level IN ('bold', 'medium', 'fine')),
  ADD COLUMN IF NOT EXISTS glitter_palette TEXT NULL
    CHECK (glitter_palette IS NULL OR glitter_palette IN ('mercury', 'mars', 'neptune', 'jupiter'));

-- Index for filtering orders by product type (admin dashboard)
CREATE INDEX IF NOT EXISTS orders_product_type_idx ON orders (product_type);

COMMENT ON COLUMN orders.product_type IS 'Production technique: paint_by_numbers, stencil_paint, or glitter_reveal';
COMMENT ON COLUMN orders.stencil_detail_level IS 'Stencil detail level (bold/medium/fine), only for stencil_paint and glitter_reveal';
COMMENT ON COLUMN orders.glitter_palette IS 'Glitter palette key, only for glitter_reveal orders';
