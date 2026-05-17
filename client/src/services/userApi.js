import { api } from './apiClient'

/* User-profile API calls — all require a session. New addresses are
   saved through the checkout flow; this removes one. */

/** Delete a saved address; resolves to the updated address list. */
export const deleteAddress = (id) =>
  api.del(`/users/addresses/${id}`).then((d) => d.addresses)
