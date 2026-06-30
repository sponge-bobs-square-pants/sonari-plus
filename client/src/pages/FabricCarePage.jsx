import PolicyLayout from '../components/layout/PolicyLayout'

const UPDATED = '29 June 2026'

const INTRO =
  'Soft fabrics last a long time when they are looked after gently. A few quiet habits will keep your nuit pieces feeling new long after the first wear.'

const SECTIONS = [
  {
    heading: 'Before the first wear',
    body: [
      'A quick rinse in cool water before the first wear removes excess dye and surface fibres — your piece will feel softer on the skin from the start.',
      'Wash darks separately for the first few cycles to avoid colour transfer.',
    ],
  },
  {
    heading: 'Washing',
    body: [
      'Cold or lukewarm water is kinder to natural fibres than hot. Set your machine to a gentle or delicate cycle, and turn the piece inside out before it goes in — this protects the outer face from friction against zippers and seams.',
      'Use a mild, neutral-pH detergent. Avoid bleach, fabric softeners, and enzyme-heavy stain removers — they break down cotton and modal fibres faster than the wear ever will.',
      'Wash similar colours together. Pair light cottons with light cottons; deep tones with deep tones.',
    ],
  },
  {
    heading: 'Washing intimates by hand',
    body: [
      'Soft-cup bras and delicate panties are best washed by hand. Soak in cool water with a small amount of mild detergent for five minutes, swirl gently — no twisting or wringing — then rinse in clean cool water until the water runs clear.',
      'If you do choose the machine, place each piece inside a mesh laundry bag on the most delicate cycle.',
    ],
  },
  {
    heading: 'Drying',
    body: [
      'Reshape the piece by hand and lay it flat on a clean towel, or hang it on a padded hanger in the shade. Direct sun fades colour and weakens cotton over time.',
      'Avoid the tumble dryer where possible. Heat shrinks cotton and stiffens the soft hand-feel that makes these pieces what they are.',
      'For bras, never hang by the straps while wet — the weight of the water stretches them out of shape. Press out water between two towels and lay flat instead.',
    ],
  },
  {
    heading: 'Ironing',
    body: [
      'Iron on the cotton setting while the piece is still slightly damp. A spritz of water from a spray bottle does the same job if it has fully dried.',
      'Lace, embroidery and printed graphics should be ironed inside out, with a thin cotton cloth between the iron and the fabric.',
    ],
  },
  {
    heading: 'Storage',
    body: [
      'Fold knits and cottons flat in a drawer rather than hanging — the weight of a fabric on a hanger over months stretches the shoulders out of true.',
      'Store bras side by side (not folded inward) with the cups facing up. Folding cups crushes the shape.',
      'Keep pieces away from direct sunlight and humidity. A cotton sachet of dried lavender or cedarwood in the drawer keeps fibres fresh and dissuades moths.',
    ],
  },
  {
    heading: 'Stains',
    body: [
      'Act quickly. Blot — never rub — with cold water. Rubbing pushes the stain deeper into the weave.',
      'For oil-based marks, sprinkle talc or cornflour on the spot and leave for an hour to absorb, then brush off and rinse.',
      'For older or set-in stains, soak in cool water with a small amount of mild detergent for a few hours before washing as usual. Avoid hot water — it sets a stain rather than lifting it.',
    ],
  },
  {
    heading: 'A note on fibre',
    body: [
      'Cotton, modal and cotton blends are alive in a quiet way — they soften with each gentle wash, take on the rhythm of how you wear them, and fade beautifully over years rather than seasons. The kindness you show them now is what you wear later.',
    ],
  },
]

/** /fabric-care — care guide for the store's pieces. */
export default function FabricCarePage() {
  return (
    <PolicyLayout
      title="Fabric care"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
