// Petits mots joints aux fleurs offertes : un est tiré au sort à chaque cadeau.
export const GIFT_MESSAGES = [
  "Une fleur pour toi, juste parce que.",
  "Merci d'être là, tout simplement.",
  "Tu rends nos journées plus jolies.",
  "Pensée du jour : tu es génial·e.",
  "Pour fleurir ta serre et ta journée.",
  "Petit coucou parfumé !",
  "Une fleur, un sourire. Garde les deux.",
  "Ta serre est magnifique, elle méritait ça.",
  "Bonne journée, tu le mérites.",
  "Un peu de couleur pour toi.",
  "Cueillie avec amour (et un peu de terre).",
  "Ça m'a fait penser à toi.",
  "Pour la meilleure personne de la salle. Chut, c'est secret.",
  "Courage pour aujourd'hui, on est avec toi !",
  "Juste un petit bonheur à garder.",
  "Si tu lis ça, tu as le droit à un câlin.",
  "Elle a poussé exprès pour toi.",
  "Une fleur pour dire : merci pour tout.",
  "Les chats approuvent ce cadeau.",
  "À arroser de rires, c'est ce qu'elle préfère.",
];

export const randomGiftMessage = () => GIFT_MESSAGES[Math.floor(Math.random() * GIFT_MESSAGES.length)];
