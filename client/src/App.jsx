import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { loadUser } from './features/auth/authSlice'
import LandingPage from './pages/LandingPage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AccountPage from './pages/AccountPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminBillsPage from './pages/admin/AdminBillsPage'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminLandingConfig from './pages/admin/AdminLandingConfig'
import RequireAuth from './components/auth/RequireAuth'
import RequireAdmin from './components/auth/RequireAdmin'
import ScrollToTop from './components/ScrollToTop'

function App() {
  const dispatch = useDispatch()

  // Restore an existing session once, on app load. The httpOnly
  // cookie (if any) is sent automatically by the /auth/me request.
  useEffect(() => {
    dispatch(loadUser())
  }, [dispatch])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund" element={<RefundPolicyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="/order/confirmed"
          element={
            <RequireAuth>
              <OrderConfirmationPage />
            </RequireAuth>
          }
        />

        {/* Admin — one guard wraps the whole section via <Outlet /> */}
        <Route element={<RequireAdmin><Outlet /></RequireAdmin>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/bills" element={<AdminBillsPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/new" element={<AdminProductForm />} />
          <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
          <Route path="/admin/landing" element={<AdminLandingConfig />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
