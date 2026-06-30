import PolicyLayout from '../components/layout/PolicyLayout'

const UPDATED = '29 June 2026'

const INTRO =
  "nuit is a small, curated store — we don't manufacture, we choose. Which means the most consequential decision we make every season is which partners we stand behind. Here's what we look for, and what we ask of the pieces that make it into the collection."

const SECTIONS = [
  {
    heading: 'How we choose what we stock',
    body: [
      'We work with a small number of partner brands whose practices align with how we want our customers to live with these pieces — slowly, comfortably, over many years.',
      'Three questions guide every partnership: Does the fabric breathe? Will the cut last beyond a season? Is the price honest for the quality?',
      'If the answer to any of those isn\'t yes, the piece doesn\'t come into the store. The collection grows quietly as a result, which is the point.',
    ],
  },
  {
    heading: 'Natural fibres, first',
    body: [
      'Cotton and modal make up the overwhelming majority of what we stock. They breathe, they take dye gently, they soften with each wash, and at the end of their wearable life they break down rather than persist in landfill for centuries.',
      'Synthetics have their place — soft-cup bra construction sometimes needs an elastic blend to hold its shape — and where we do stock them, we choose partners who use recycled or lower-impact blends and disclose the composition honestly on the label.',
    ],
  },
  {
    heading: 'Made to last',
    body: [
      'Fast fashion teaches customers that a piece is something to wear five times and replace. The pieces we stock are designed to be the opposite — bought once, worn often, kept for years.',
      'Seams are reinforced. Stitch counts are higher than the cheap commodity standard. Buttons are sewn rather than glued. These are small details that add a rupee or two to the unit cost but quadruple the wear life.',
    ],
  },
  {
    heading: 'Small batches',
    body: [
      'We order small batches and reorder what proves itself, rather than committing to large factory runs of every design. It means our inventory stays close to demand, and waste — the cost of pieces no one wants that quietly end up burned or buried — is meaningfully lower than the industry norm.',
      'It also means a piece you love may sometimes sell out before we can restock it. We think of that as a feature: scarcity protects against overproduction.',
    ],
  },
  {
    heading: 'Packaging',
    body: [
      'Orders ship in recyclable paper mailers with a paper sticker and no plastic tape. Inside, each piece is folded in tissue rather than wrapped in plastic.',
      'We do not include marketing inserts, return-bag plastics, or branded filler. The packaging is meant to deliver your piece safely and then go away — quietly, without contributing to the bin you carry to the curb each week.',
    ],
  },
  {
    heading: 'The longer view',
    body: [
      'No store is perfectly sustainable, including this one. The most sustainable garment is the one you already own.',
      "What we can promise is that we will keep choosing partners who do the harder, slower work of making clothes well; we will keep telling you honestly what each piece is made of and how to care for it; and we will keep the collection small enough that nothing is here because of a marketing schedule. That's the longer view — and it's the work.",
    ],
  },
]

/** /sustainability — how we choose partners + what we ask of the pieces. */
export default function SustainabilityPage() {
  return (
    <PolicyLayout
      title="Sustainability"
      updated={UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  )
}
