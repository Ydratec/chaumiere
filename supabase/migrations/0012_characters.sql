-- Personnage de chaque membre dans une salle : espèce, couleur, accessoire (null = personnage par défaut).
-- Les espèces/accessoires achetés sont des objets « skin:… » dans farm_items (payés en pièces de la serre).
alter table room_members add column character jsonb;
