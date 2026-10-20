// Constantes du cours
const E_CHARGE = 1.6e-19;   // C
const M_P = 1.67e-27;       // kg (m_p ≈ m_n)
const M_E = 9.1e-31;        // kg

// Les 18 premiers éléments (3 premières périodes).
// A : nombre de masse de l'isotope le plus courant
// ion : charge de l'ion usuel (0 = gaz rare stable, null = pas d'ion simple)
// stableN : nombres de neutrons donnant un isotope stable
const ELEMENTS = [
  { z: 1,  sym: 'H',  A: 1,  cat: 'nonmetal',  ion: 1,    stableN: [0, 1],
    names: { fr: 'Hydrogène', en: 'Hydrogen', ar: 'الهيدروجين' },
    fact: { fr: "L'élément le plus abondant de l'Univers : c'est le carburant des étoiles.", en: 'The most abundant element in the Universe — the fuel of stars.', ar: 'أكثر العناصر وفرة في الكون، وهو وقود النجوم.' } },
  { z: 2,  sym: 'He', A: 4,  cat: 'noble',     ion: 0,    stableN: [1, 2],
    names: { fr: 'Hélium', en: 'Helium', ar: 'الهيليوم' },
    fact: { fr: "Plus léger que l'air : c'est lui qui fait flotter les ballons.", en: 'Lighter than air — it is what makes balloons float.', ar: 'أخف من الهواء، وهو الذي يجعل البالونات تطفو.' } },
  { z: 3,  sym: 'Li', A: 7,  cat: 'alkali',    ion: 1,    stableN: [3, 4],
    names: { fr: 'Lithium', en: 'Lithium', ar: 'الليثيوم' },
    fact: { fr: 'Il se trouve au cœur des batteries de nos téléphones.', en: 'It sits at the heart of our phone batteries.', ar: 'يوجد في قلب بطاريات هواتفنا.' } },
  { z: 4,  sym: 'Be', A: 9,  cat: 'alkaline',  ion: 2,    stableN: [5],
    names: { fr: 'Béryllium', en: 'Beryllium', ar: 'البيريليوم' },
    fact: { fr: 'Métal léger et rigide utilisé dans les satellites et les télescopes spatiaux.', en: 'A light, stiff metal used in satellites and space telescopes.', ar: 'فلز خفيف وصلب يُستعمل في الأقمار الاصطناعية والتلسكوبات الفضائية.' } },
  { z: 5,  sym: 'B',  A: 11, cat: 'metalloid', ion: null, stableN: [5, 6],
    names: { fr: 'Bore', en: 'Boron', ar: 'البور' },
    fact: { fr: 'On le trouve dans le verre Pyrex qui résiste à la chaleur.', en: 'Found in heat-resistant Pyrex glass.', ar: 'يدخل في صناعة زجاج البيركس المقاوم للحرارة.' } },
  { z: 6,  sym: 'C',  A: 12, cat: 'nonmetal',  ion: null, stableN: [6, 7],
    names: { fr: 'Carbone', en: 'Carbon', ar: 'الكربون' },
    fact: { fr: 'Base de toute la vie ; il forme aussi le diamant et le graphite des crayons.', en: 'The basis of all life; it also forms diamond and pencil graphite.', ar: 'أساس كل أشكال الحياة، ويكوّن أيضًا الماس وغرافيت أقلام الرصاص.' } },
  { z: 7,  sym: 'N',  A: 14, cat: 'nonmetal',  ion: -3,   stableN: [7, 8],
    names: { fr: 'Azote', en: 'Nitrogen', ar: 'الآزوت' },
    fact: { fr: "Il représente environ 78 % de l'air que nous respirons.", en: 'It makes up about 78% of the air we breathe.', ar: 'يشكل حوالي 78% من الهواء الذي نتنفسه.' } },
  { z: 8,  sym: 'O',  A: 16, cat: 'nonmetal',  ion: -2,   stableN: [8, 9, 10],
    names: { fr: 'Oxygène', en: 'Oxygen', ar: 'الأكسجين' },
    fact: { fr: "Environ 21 % de l'air ; indispensable à la respiration et aux combustions.", en: 'About 21% of air; essential for breathing and burning.', ar: 'يشكل حوالي 21% من الهواء، وهو ضروري للتنفس والاحتراق.' } },
  { z: 9,  sym: 'F',  A: 19, cat: 'halogen',   ion: -1,   stableN: [10],
    names: { fr: 'Fluor', en: 'Fluorine', ar: 'الفلور' },
    fact: { fr: 'Ajouté aux dentifrices (fluorures) pour protéger les dents.', en: 'Added to toothpaste (as fluoride) to protect teeth.', ar: 'يضاف إلى معجون الأسنان (الفلورور) لحمايتها.' } },
  { z: 10, sym: 'Ne', A: 20, cat: 'noble',     ion: 0,    stableN: [10, 11, 12],
    names: { fr: 'Néon', en: 'Neon', ar: 'النيون' },
    fact: { fr: 'Il donne la lumière rouge-orangé des enseignes lumineuses.', en: 'It gives neon signs their red-orange glow.', ar: 'يعطي اللون الأحمر البرتقالي للّافتات المضيئة.' } },
  { z: 11, sym: 'Na', A: 23, cat: 'alkali',    ion: 1,    stableN: [12],
    names: { fr: 'Sodium', en: 'Sodium', ar: 'الصوديوم' },
    fact: { fr: 'Avec le chlore, il forme le sel de cuisine (NaCl).', en: 'Together with chlorine it forms table salt (NaCl).', ar: 'يكوّن مع الكلور ملح الطعام (NaCl).' } },
  { z: 12, sym: 'Mg', A: 24, cat: 'alkaline',  ion: 2,    stableN: [12, 13, 14],
    names: { fr: 'Magnésium', en: 'Magnesium', ar: 'المغنيزيوم' },
    fact: { fr: 'Il brûle avec une flamme blanche éblouissante.', en: 'It burns with a dazzling white flame.', ar: 'يحترق بلهب أبيض ساطع.' } },
  { z: 13, sym: 'Al', A: 27, cat: 'metal',     ion: 3,    stableN: [14],
    names: { fr: 'Aluminium', en: 'Aluminium', ar: 'الألومنيوم' },
    fact: { fr: 'Le métal le plus abondant de la croûte terrestre : canettes, papier alu…', en: "The most abundant metal in Earth's crust: cans, kitchen foil…", ar: 'أكثر الفلزات وفرة في القشرة الأرضية: العلب وورق الألومنيوم…' } },
  { z: 14, sym: 'Si', A: 28, cat: 'metalloid', ion: null, stableN: [14, 15, 16],
    names: { fr: 'Silicium', en: 'Silicon', ar: 'السيليسيوم' },
    fact: { fr: 'Le sable en est plein ; il est la base des puces électroniques.', en: 'Sand is full of it; it is the basis of computer chips.', ar: 'يوجد بكثرة في الرمل، وهو أساس الرقائق الإلكترونية.' } },
  { z: 15, sym: 'P',  A: 31, cat: 'nonmetal',  ion: -3,   stableN: [16],
    names: { fr: 'Phosphore', en: 'Phosphorus', ar: 'الفوسفور' },
    fact: { fr: 'Utilisé dans les allumettes et les engrais.', en: 'Used in matches and fertilisers.', ar: 'يُستعمل في أعواد الثقاب والأسمدة.' } },
  { z: 16, sym: 'S',  A: 32, cat: 'nonmetal',  ion: -2,   stableN: [16, 17, 18, 20],
    names: { fr: 'Soufre', en: 'Sulfur', ar: 'الكبريت' },
    fact: { fr: "Solide jaune ; certains de ses composés sentent l'œuf pourri.", en: 'A yellow solid; some of its compounds smell of rotten eggs.', ar: 'جسم صلب أصفر، ولبعض مركباته رائحة البيض الفاسد.' } },
  { z: 17, sym: 'Cl', A: 35, cat: 'halogen',   ion: -1,   stableN: [18, 20],
    names: { fr: 'Chlore', en: 'Chlorine', ar: 'الكلور' },
    fact: { fr: "Il sert à désinfecter l'eau des piscines.", en: 'It is used to disinfect swimming-pool water.', ar: 'يُستعمل لتعقيم مياه المسابح.' } },
  { z: 18, sym: 'Ar', A: 40, cat: 'noble',     ion: 0,    stableN: [18, 20, 22],
    names: { fr: 'Argon', en: 'Argon', ar: 'الأرغون' },
    fact: { fr: "Gaz inerte qui remplit certaines ampoules à filament.", en: 'An inert gas that fills some filament light bulbs.', ar: 'غاز خامل يملأ بعض المصابيح ذات الفتيل.' } },
];

const CATEGORIES = ['alkali', 'alkaline', 'metal', 'metalloid', 'nonmetal', 'halogen', 'noble'];
