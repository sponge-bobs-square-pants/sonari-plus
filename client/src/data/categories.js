import nightwearImage from '../assets/categories/category-nightwear.png'
import nightdressesImage from '../assets/categories/category-nightdresses.png'
import brasImage from '../assets/categories/category-bras.png'
import pantiesImage from '../assets/categories/category-panties.png'

// Size sets differ by category — apparel runs XS–XL, kids runs numeric.
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const KIDS_SIZES = ['8', '10', '12', '14', '16']

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
    name: 'Night suits',
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
    sizes: APPAREL_SIZES,
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
]

/** The size set for a category id — falls back to apparel sizes. */
export const sizesForCategory = (id) =>
  categories.find((c) => c.id === id)?.sizes ?? APPAREL_SIZES
