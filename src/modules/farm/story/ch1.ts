// Chapitre 1 : « Le Hameau des Brumes ». Actes 1 et 2 (la suite arrive avec les actes 3 et 4).
import type { Chapter, Who } from "./types.ts";

export const NPCS: Record<Who, { name: string; role: string }> = {
  mirabelle: { name: "Mirabelle", role: "Le fantôme de la serre" },
  pistache: { name: "Pistache", role: "Renard et grand voleur d'œufs" },
  colonel: { name: "Colonel Moustache", role: "Maire du hameau" },
  zinnia: { name: "Zinnia", role: "Fleuriste" },
};

/** Un mot du jour : une petite réplique différente chaque jour, pour que le hameau vive. */
export const DAILY: { who: Who; text: string }[] = [
  { who: "mirabelle", text: "Ce matin, la brume sentait la menthe. Bon signe, ou alors j'ai encore parlé au thym." },
  { who: "pistache", text: "Je n'ai rien pris. Regarde mes pattes. Elles sont propres. Presque." },
  { who: "colonel", text: "Hou. Le coq du voisin chante faux. Je n'ai rien contre. Je note, c'est tout." },
  { who: "zinnia", text: "J'ai mis un bouquet à la fenêtre de l'école. Personne n'a rien dit. C'est déjà beaucoup." },
  { who: "mirabelle", text: "On m'a dit que les fantômes n'ont pas de dos. Je tiens à préciser que le mien me fait mal." },
  { who: "pistache", text: "Il pleut. Les poules râlent. Moi, je trouve ça apaisant. Les poules, un peu moins." },
  { who: "colonel", text: "Quarante-deux pas jusqu'à la serre. Je les ai comptés. Ça n'a rien de particulier. Hou." },
  { who: "zinnia", text: "Les fleurs poussent mieux quand on leur parle. Je leur ai raconté ta journée. Elles étaient ravies." },
];

export const ch1: Chapter = {
  n: 1,
  title: "Le Hameau des Brumes",
  trophy: "Voisin du Hameau",
  acts: [
    { n: 1, day: 1, title: "Le testament", teaser: "Mirabelle a laissé la serre à quelqu'un. Pourquoi vous ?" },
    { n: 2, day: 8, title: "Le village endormi", teaser: "Quelqu'un attend sur le vieux pont…" },
    { n: 3, day: 15, title: "La grande brume", teaser: "" },
    { n: 4, day: 22, title: "La Fête des Brumes", teaser: "" },
  ],
  quests: [
    // ---------- Acte 1 : Le testament ----------
    {
      id: "semis", act: 1, title: "Les premières pousses",
      intro: [
        { who: "mirabelle", text: "Oh ! Quelqu'un ! Quelqu'un qui me voit ! Ne cours pas, mon petit chou, je ne mords pas. Je ne mords plus, en tout cas." },
        { who: "mirabelle", text: "Je suis Mirabelle. Cette serre était à moi, et maintenant elle est à toi : c'est écrit dans mon testament. J'ai relu trois fois." },
        { who: "mirabelle", text: "Alors, au travail ! Plante-moi un peu de blé. Il y a trop de silence ici : ça fait du bien d'entendre pousser quelque chose." },
      ],
      outro: [
        { who: "mirabelle", text: "Écoute-moi ça… six épis tout dorés. Ça sent la maison, tu ne trouves pas ?" },
        { who: "mirabelle", text: "Dis… tu sais pourquoi je t'ai choisi ? Non ? Moi non plus, je crois. Enfin si. Mais pas tout de suite." },
      ],
      goal: { kind: "harvest", item: "wheat", n: 6 },
      reward: { coins: 30 },
      page: { title: "Premier matin", text: "Le blé a levé ce matin. Hier encore, la serre était si silencieuse que j'entendais la brume tomber. Aujourd'hui, quelqu'un respire dans mes allées. Quelqu'un que je n'ai jamais rencontré, et que pourtant j'attendais." },
    },
    {
      id: "pain", act: 1, title: "Une odeur de pain",
      intro: [
        { who: "mirabelle", text: "Tu me ferais un grand plaisir. Je ne peux plus rien manger, évidemment. Mais l'odeur du pain chaud… c'est la seule chose dont mon fantôme se souvienne vraiment." },
        { who: "mirabelle", text: "Apporte-moi six blés : en échange, je te prête le plan de mon vieux four. Il dort quelque part, au fond de mes souvenirs." },
      ],
      outro: [{ who: "mirabelle", text: "Parfait ! Le plan du four est à toi. Il coûte un peu cher à monter, mais un four, ça ne ment jamais." }],
      goal: { kind: "deliver", items: { wheat: 6 } },
      reward: { coins: 90, unlocks: ["b:oven"] },
      page: { title: "Le four", text: "Le four de ma mère faisait vingt miches par semaine, et toutes disparaissaient avant le dimanche. Il y avait toujours quelqu'un à la porte. Je n'ai jamais su dire non à un affamé." },
    },
    {
      id: "four", act: 1, title: "Le four de Grand-mère",
      intro: [{ who: "mirabelle", text: "Construis-moi ce four, mon petit chou. Là, à côté des bacs. Et pas de travers, hein : je vois tout." }],
      outro: [{ who: "mirabelle", text: "Il est de travers. Je plaisante ! Il est magnifique. Allume-le, on va faire des miches." }],
      goal: { kind: "own", building: "oven", n: 1 },
      reward: { coins: 60, unlocks: ["cap:planter:7"] },
      page: { title: "La pierre chaude", text: "Il suffit d'une pierre chaude pour qu'une cuisine devienne une maison. Je dis ça parce que la mienne est restée tiède trente ans." },
    },
    {
      id: "miches", act: 1, title: "Les premières miches",
      intro: [{ who: "mirabelle", text: "Trois miches. Trois, ce n'est pas la mer à boire. Et si ça brûle, on dira que c'est la mode." }],
      outro: [
        { who: "mirabelle", text: "…Pas mal. Pas mal du tout. Quand le village sentait le pain, tout le monde sortait de chez soi, tu sais." },
        { who: "mirabelle", text: "Aujourd'hui, il n'y a plus que la brume. Tiens, je te débloque le poulailler : un peu de vie ici ne ferait pas de mal." },
      ],
      goal: { kind: "harvest", item: "bread", n: 3 },
      reward: { coins: 40, unlocks: ["b:coop", "cap:pot:7"] },
      page: { title: "Le pain du dimanche", text: "Le dimanche, je laissais une miche sur le rebord de la fenêtre, pour celui qui passerait. C'est Armand qui la prenait toujours. Il faisait semblant de ne pas la voir, et il la prenait." },
    },
    {
      id: "poulailler", act: 1, title: "Des poules, enfin !",
      intro: [{ who: "mirabelle", text: "Il faut des œufs pour les gâteaux, et des poules pour les œufs. C'est la loi, je ne l'ai pas inventée." }],
      outro: [
        { who: "pistache", text: "Ahem. Bonjour. Je passais par là. Je ne cherche rien. Surtout pas des poules." },
        { who: "mirabelle", text: "Pistache ! Il y a un renard derrière ton poulailler, mon petit chou. Il est inoffensif. Enfin, il l'était avant d'avoir de la famille." },
        { who: "pistache", text: "De la famille ? Quelle famille ? Je n'ai jamais dit… Bon. D'accord. Un petit. Un seul." },
      ],
      goal: { kind: "own", building: "coop", n: 1 },
      reward: { coins: 50, unlocks: ["cap:planter:9"] },
      page: { title: "Pistache", text: "Un renard rôde depuis cet hiver. Il croit que je ne le vois pas. Il repart toujours avec les plus petits œufs, jamais avec les gros. Un voleur qui laisse les gros œufs, ça cache quelque chose." },
    },
    {
      id: "oeufs", act: 1, title: "Une petite bouche à nourrir",
      intro: [
        { who: "pistache", text: "Écoute… Il y a des nuits où il n'y a plus rien dans les bois. Et à la maison, quelqu'un compte sur moi." },
        { who: "pistache", text: "Je ne sais pas demander. Je sais seulement prendre. Alors… si tu pouvais… quatre œufs ?" },
      ],
      outro: [
        { who: "pistache", text: "Merci. Je… merci. Je te revaudrai ça. Un renard n'oublie rien." },
        { who: "mirabelle", text: "Tu vois ? Je savais que tu avais bon cœur. Le village finira par le savoir aussi. Mais le village… dort encore." },
        { who: "mirabelle", text: "Il y a une lettre, dans la cave. Pas encore, mon petit chou. Pas encore." },
      ],
      goal: { kind: "deliver", items: { egg: 4 } },
      reward: { coins: 80, unlocks: ["cap:pot:9"] },
      page: { title: "Une promesse", text: "Ce soir, un renard a dit merci. Ça faisait trente ans que personne ne m'avait remercié de rien. Je crois que je pleure. Les fantômes pleurent-ils ? Mon drap est tout mouillé." },
    },

    // ---------- Acte 2 : Le village endormi ----------
    {
      id: "fleurs", act: 2, title: "Des fleurs pour la place",
      intro: [
        { who: "zinnia", text: "Euh… bonjour. Je suis Zinnia. La fleuriste. Enfin, j'étais fleuriste. Enfin, je suis fleuriste, mais il n'y a plus de clients." },
        { who: "zinnia", text: "Mirabelle m'a dit que ta serre avait de la place. Je voudrais remettre des fleurs sur la place du village. Pour que ça… ait l'air vivant." },
      ],
      outro: [
        { who: "zinnia", text: "Elles sont belles ! Trop belles. Je vais les poser dans les vieilles jardinières, devant l'église." },
        { who: "mirabelle", text: "Zinnia, ma petite. Elle a mes mains pour les fleurs. Et mon sale caractère, quand elle s'y met." },
      ],
      goal: { kind: "harvest", item: "flower", n: 8 },
      reward: { coins: 50, unlocks: ["cap:pot:11"] },
      page: { title: "Zinnia", text: "La petite Zinnia est passée à la serre. Elle n'ose pas me voir, mais elle sent que je suis là : elle parle un peu plus bas que d'habitude. C'est comme ça qu'on parle aux fantômes. C'est comme ça qu'on parle aux absents." },
    },
    {
      id: "soupe", act: 2, title: "La soupe du hameau",
      intro: [
        { who: "zinnia", text: "Le Colonel dit que personne ne mangera de soupe tant que la brume sera là. Moi je dis que la soupe, ça se prépare avant que la brume parte." },
        { who: "zinnia", text: "Six carottes et quatre fleurs pour la table : ça fera un joli bol, et peut-être un sourire." },
      ],
      outro: [
        { who: "zinnia", text: "Une porte s'est ouverte ! Une vraie porte, au bout de la rue. Ils ont senti la soupe, ils ont ouvert." },
        { who: "zinnia", text: "Ça faisait si longtemps que je n'avais pas vu quelqu'un franchir un seuil pour moi." },
      ],
      goal: { kind: "deliver", items: { carrot: 6, flower: 4 } },
      reward: { coins: 70, unlocks: ["cap:planter:11"] },
      page: { title: "La soupe", text: "On dit qu'une soupe partagée vaut dix discours. J'en ai fait des centaines, de ces soupes. Dommage que je n'aie jamais su faire un seul bon discours." },
    },
    {
      id: "colonel", act: 2, title: "Le maire grognon",
      intro: [
        { who: "colonel", text: "Hou. Hou-hou. C'est donc vous, le nouveau de la serre. Colonel Moustache, maire du hameau. Je ne dérange pas. Je n'aime pas être dérangé." },
        { who: "colonel", text: "On m'a dit que vous faisiez du pain. Du vrai. Quatre miches, si vous voulez bien. Pour le conseil. Il y a… de moins en moins de conseil, mais il y a le principe." },
      ],
      outro: [
        { who: "colonel", text: "Hmm. C'est chaud. Croustillant. Ça ressemble au pain de… enfin. À du bon pain." },
        { who: "mirabelle", text: "Il a failli dire mon nom. Tu as vu ? Il a failli." },
      ],
      goal: { kind: "deliver", items: { bread: 4 } },
      reward: { coins: 100 },
      page: { title: "Le Colonel", text: "Armand Moustache. Quarante ans qu'il fait semblant de ne plus me connaître. Pourtant, il n'a jamais mangé que mon pain." },
    },
    {
      id: "lanterne", act: 2, title: "La lanterne du Colonel",
      intro: [
        { who: "colonel", text: "Chaque soir, j'allume une lanterne à ma fenêtre. Personne ne me l'a demandé. Je le fais, c'est tout. Elle brûle à l'huile de maïs." },
        { who: "colonel", text: "Cet hiver, mon stock a fondu. Huit maïs, pour que la lueur ne s'éteigne pas. Hou." },
      ],
      outro: [
        { who: "colonel", text: "Elle brille plus fort que d'habitude. C'est peut-être le maïs." },
        { who: "mirabelle", text: "Ce n'est pas le maïs, Armand… Pour qui l'allumes-tu, cette lanterne, tu crois ?" },
      ],
      goal: { kind: "deliver", items: { corn: 8 } },
      reward: { coins: 90, unlocks: ["cap:planter:13", "cap:coop:2"] },
      page: { title: "La lanterne", text: "Il y a une lanterne, derrière la brume, qui brille chaque soir à la même fenêtre. Depuis trente ans. Je la vois depuis la serre. C'est ma façon de savoir qu'il pense encore à ce soir-là." },
    },
    {
      id: "brume", act: 2, title: "La brume qui ne part pas",
      intro: [
        { who: "zinnia", text: "Les anciens disent que la brume est tombée le soir de la dernière Fête, et qu'elle n'est jamais repartie." },
        { who: "zinnia", text: "Mirabelle faisait une confiture de fraises pour la Fête. J'ai retrouvé son carnet de recettes. Dix fraises, et on verra ce qu'on arrive à relire." },
      ],
      outro: [
        { who: "zinnia", text: "La recette est là, de sa belle écriture. Mais la dernière page est déchirée. Quelqu'un l'a arrachée." },
        { who: "mirabelle", text: "…Ah. Ça, mon petit chou, c'est une longue histoire." },
      ],
      goal: { kind: "harvest", item: "strawberry", n: 10 },
      reward: { coins: 120, unlocks: ["cap:pot:14", "cap:planter:15"] },
      page: { title: "La Fête", text: "On l'appelait la Fête des Brumes. Une nuit par an, on suspendait des lanternes à toutes les fenêtres pour guider les voyageurs. Je ne sais pas combien de fois j'ai préparé cette fête. Je sais combien de fois j'aurais voulu la préparer une dernière fois." },
    },
    {
      id: "gateau", act: 2, title: "Un gâteau pour tout dire",
      intro: [
        { who: "mirabelle", text: "Il est temps. Pas pour la lettre : pour le gâteau. Le Colonel va venir à la serre. Il ne le sait pas encore." },
        { who: "mirabelle", text: "Deux gâteaux et quatre œufs frais. Les gâteaux de la Fête, c'était sa passion." },
      ],
      outro: [
        { who: "colonel", text: "Hou. J'ai suivi une odeur. Vous m'avez tendu un piège, avec du gâteau." },
        { who: "colonel", text: "…C'est son gâteau. C'est exactement son gâteau." },
        { who: "mirabelle", text: "Armand… tu m'entends ?" },
        { who: "colonel", text: "J'entends le vent. Seulement le vent. Mais quelqu'un attend sur le vieux pont, depuis ce matin. Je ne sais pas qui." },
        { who: "pistache", text: "Quelqu'un ? Je vais voir !" },
        { who: "mirabelle", text: "Non… pas déjà." },
      ],
      goal: { kind: "deliver", items: { cake: 2, egg: 4 } },
      reward: { coins: 200, unlocks: ["cap:planter:18"] },
      page: { title: "Le pont", text: "Quelqu'un est arrivé sur le vieux pont. Ça fait trente ans que personne n'y a mis les pieds. J'ai peur, mon petit chou. J'ai très peur, et je ne sais plus pourquoi je suis la seule à avoir peur." },
    },
  ],
};
