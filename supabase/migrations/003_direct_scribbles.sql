-- ============================================================
-- Direct scribble studio support
-- Allows direct full-shirt marks to save as larger independent layers.
-- ============================================================

alter table scribbles drop constraint if exists scribbles_w_check;
alter table scribbles drop constraint if exists scribbles_h_check;

alter table scribbles
  add constraint scribbles_w_check check (w between 40 and 600),
  add constraint scribbles_h_check check (h between 40 and 600);
