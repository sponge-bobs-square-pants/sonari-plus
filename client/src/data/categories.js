import nightwearImage from '../assets/categories/v5/category-nightwear.png';
import nightdressesImage from '../assets/categories/v5/category-nightdresses.png';
import brasImage from '../assets/categories/v5/category-bras.png';
import pantiesImage from '../assets/categories/v5/category-panties.png';

// Size sets differ by category — apparel runs XS–6XL, kids runs numeric.
// Order matters: the admin form + filter sort variants by indexOf in this
// array (small → large), so new sizes go at the end of their run.
const APPAREL_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL',
  '4XL',
  '5XL',
  '6XL',
];
const KIDS_SIZES = [
  '4',
  '6',
  '8',
  '10',
  '12',
  '14',
  '16',
  '18',
  '20',
  '22',
  '24',
  '26',
  '28',
  '30',
  '32',
  '34',
];
// Bras are sized on two axes: band (the `sizes` list) × cup. The full
// universe is offered; the admin toggles which band×cup combos a product
// actually stocks.
const BRA_BANDS = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
const BRA_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'];

/**
 * Site categories — the single source for the menu, the shop, the admin
 * form and the filters.
 *
 * `span` carries the Tailwind grid classes for the homepage gallery's
 * irregular layout; a category WITHOUT `span` (e.g. Kids) is shown in the
 * menu/shop but not as a homepage tile. `align` places the gallery tile's
 * caption. `sizes` is the size set the admin form + filter offer.
 */
export const categories = [
  {
    id: 'nightwear',
    name: 'Cordset',
    blurb: 'Slips, sets & robes',
    sizes: APPAREL_SIZES,
    image: nightwearImage,
    span: 'md:col-span-5 md:row-span-2',
    shadowEdge: 'right',
  },
  {
    id: 'nightdresses',
    name: 'Night wear',
    blurb: 'Long, short & between',
    sizes: APPAREL_SIZES,
    image: nightdressesImage,
    span: 'md:col-span-7',
    align: 'top-right',
    shadowEdge: 'bottom-left',
  },
  {
    id: 'bras',
    name: 'Bras',
    blurb: 'Soft-cup & wireless',
    // Two-axis sizing: `sizes` is the band list, `cups` the cup list.
    // A category having `cups` flags it as band×cup throughout the app.
    sizes: BRA_BANDS,
    cups: BRA_CUPS,
    image: brasImage,
    span: 'md:col-span-4',
    shadowEdge: 'no-bottom',
  },
  {
    id: 'panties',
    name: 'Panties',
    blurb: 'Everyday essentials',
    sizes: APPAREL_SIZES,
    image: pantiesImage,
    span: 'md:col-span-3',
    align: 'bottom-right',
    shadowEdge: 'top-left',
  },
  {
    // No `span` → menu + shop only, not a homepage gallery tile.
    id: 'kids',
    name: 'Kids',
    blurb: 'Boys & girls',
    sizes: KIDS_SIZES,
  },
];

/** The size set for a category id — falls back to apparel sizes. */
export const sizesForCategory = (id) =>
  categories.find((c) => c.id === id)?.sizes ?? APPAREL_SIZES;

/** The cup set for a category id, or null if it isn't a two-axis category. */
export const cupsForCategory = (id) =>
  categories.find((c) => c.id === id)?.cups ?? null;

/**
 * How a chosen variant's size reads to a customer. Bras combine band + cup
 * ('32' + 'B' → '32B'); everything else is just the size. `v` is anything
 * with `{ size, cup }` — a variant, cart item, or order item.
 */
export const displaySize = (v) =>
  v?.cup ? `${v.size}${v.cup}` : (v?.size ?? '');
