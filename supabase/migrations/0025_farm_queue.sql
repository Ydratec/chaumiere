-- File d'attente des bâtiments (poulailler, four, atelier) : les recettes mises en attente derrière celle en cours,
-- chacune avec son échéance ([{ "item": "bread", "ready_at": "…" }]). Payées à la mise en file.
alter table farm_tiles add column queue jsonb not null default '[]';
