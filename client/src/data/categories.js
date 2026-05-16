import nightwearImage from '../assets/categories/category-nightwear.png'
import nightdressesImage from '../assets/categories/category-nightdresses.png'
import brasImage from '../assets/categories/category-bras.png'
import pantiesImage from '../assets/categories/category-panties.png'

/**
 * Homepage categories. `span` carries the Tailwind grid classes for
 * the irregular gallery layout (one tall feature tile + three supporting tiles).
 * `align` places the caption inside the tile so it lands on the photo's
 * empty space — defaults to bottom-left in CategoryGallery.
 */
export const categories = [
  {
    id: 'nightwear',
    name: 'Nightwear',
    blurb: 'Slips, sets & robes',
    count: 24,
    image: nightwearImage,
    span: 'md:col-span-5 md:row-span-2',
    shadowEdge: 'right',
  },
  {
    id: 'nightdresses',
    name: 'Nightdresses',
    blurb: 'Long, short & between',
    count: 18,
    image: nightdressesImage,
    span: 'md:col-span-7',
    align: 'top-right',
    shadowEdge: 'bottom-left',
  },
  {
    id: 'bras',
    name: 'Bras',
    blurb: 'Soft-cup & wireless',
    count: 31,
    image: brasImage,
    span: 'md:col-span-4',
    shadowEdge: 'no-bottom',
  },
  {
    id: 'panties',
    name: 'Panties',
    blurb: 'Everyday essentials',
    count: 27,
    image: pantiesImage,
    span: 'md:col-span-3',
    align: 'bottom-right',
    shadowEdge: 'top-left',
  },
]
