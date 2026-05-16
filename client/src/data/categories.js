import nightwearImage from '../assets/categories/category-nightwear.png'
import nightdressesImage from '../assets/categories/category-nightdresses.png'
import brasImage from '../assets/categories/category-bras.png'
import pantiesImage from '../assets/categories/category-panties.png'

/**
 * Homepage categories. `span` carries the Tailwind grid classes for
 * the irregular gallery layout (one tall feature tile + three supporting tiles).
 */
export const categories = [
  {
    id: 'nightwear',
    name: 'Nightwear',
    blurb: 'Slips, sets & robes',
    count: 24,
    image: nightwearImage,
    span: 'md:col-span-5 md:row-span-2',
  },
  {
    id: 'nightdresses',
    name: 'Nightdresses',
    blurb: 'Long, short & between',
    count: 18,
    image: nightdressesImage,
    span: 'md:col-span-7',
  },
  {
    id: 'bras',
    name: 'Bras',
    blurb: 'Soft-cup & wireless',
    count: 31,
    image: brasImage,
    span: 'md:col-span-4',
  },
  {
    id: 'panties',
    name: 'Panties',
    blurb: 'Everyday essentials',
    count: 27,
    image: pantiesImage,
    span: 'md:col-span-3',
  },
]
