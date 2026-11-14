import {
  getAdminUsers,
  getAdminCategories,
  getAdminUserActivity,
  updateAdminUserStatus,
  updateAdminListingStatus,
  type AdminUserActivity,
} from "./admin-api";
import { runAiSearch, type AISearchResponse } from "./ai-search-api";
import {
  deactivateAccount as apiDeactivateAccount,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  type AuthUser,
} from "./auth-api";
import {
  getAdminContactMessages,
  getMyContactMessages,
  submitContactMessage,
  updateContactMessageStatus,
  type ContactMessage,
} from "./contact-api";
import {
  addCartItemApi,
  addFavouriteApi,
  createListingApi,
  createOfferApi,
  deleteListingApi,
  deleteListingImageApi,
  downloadSaleReceiptPdf,
  getCartListingIds,
  getFavouriteListingIds,
  getMyPurchasesApi,
  getMySoldItemsApi,
  getReceivedOffersApi,
  getSentOffersApi,
  processMockPaymentApi,
  removeCartItemApi,
  removeFavouriteApi,
  updateListingApi,
  updateListingImageOrderApi,
  updateOfferStatusApi,
  uploadListingImageFile,
  type MockPaymentResult,
  type OfferDetail,
  type SaleDetail,
} from "./marketplace-api";
import {
  fetchCategories,
  fetchProducts,
  type ApiImageRecord,
  type CategoryItem,
} from "./products-api";
import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bike,
  BookOpen,
  Bot,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Home as HomeIcon,
  LayoutDashboard,
  Leaf,
  LogOut,
  Mail,
  Menu,
  PackageCheck,
  Printer,
  Recycle,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Trash2,
  UploadCloud,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

const photos = {
  calculator:
    "https://images.unsplash.com/photo-1783578691777-35e73eef4d01?auto=format&fit=crop&w=900&q=82",
  cycle:
    "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=900&q=82",
  books:
    "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=900&q=82",
  lamp:
    "https://images.unsplash.com/photo-1598984170607-d8ef7e13cf43?auto=format&fit=crop&w=900&q=82",
  headphones:
    "https://images.unsplash.com/photo-1757946718516-fddeb8d3ed9b?auto=format&fit=crop&w=900&q=82",
  shelf:
    "https://images.unsplash.com/photo-1638780506095-3d61a4f0edd6?auto=format&fit=crop&w=900&q=82",
  sports:
    "https://images.unsplash.com/photo-1716155249759-b5f068f74e63?auto=format&fit=crop&w=900&q=82",
  programming:
    "https://images.unsplash.com/photo-1484665739383-a1069a82d4be?auto=format&fit=crop&w=900&q=82",
};

type Product = {
  id: number;
  sellerId?: number;
  sellerName?: string;
  categoryId?: number;
  title: string;
  description?: string;
  price: string;
  numericPrice?: number;
  condition: "New" | "Used";
  category: string;
  brand?: string | null;
  color?: string | null;
  image: string;
  images?: string[];
  imageRecords?: ApiImageRecord[];
  status?: "Available" | "Reserved" | "Sold";
  createdAt?: string;
};

const ProductsContext = createContext<Product[]>([]);
const useProducts = () => useContext(ProductsContext);

const categoryImages: Record<string, string> = {
  "Books & Study Materials": photos.books,
  "Electronics & Gadgets": photos.headphones,
  "Clothing & Fashion": photos.shelf,
  "Stationery & Academic Accessories": photos.calculator,
  "Sports & Fitness": photos.sports,
  "Daily Use & Hostel Essentials": photos.lamp,
  "Cycles & Accessories": photos.cycle,
  Other: photos.shelf,
  Books: photos.books,
  Electronics: photos.headphones,
  Furniture: photos.shelf,
  Cycles: photos.cycle,
  Stationery: photos.calculator,
  "Hostel Essentials": photos.lamp,
};

const CANONICAL_CATEGORIES = [
  "Books & Study Materials",
  "Electronics & Gadgets",
  "Clothing & Fashion",
  "Stationery & Academic Accessories",
  "Sports & Fitness",
  "Daily Use & Hostel Essentials",
  "Cycles & Accessories",
  "Other",
] as const;

type CartContextValue = {
  currentUser: AuthUser | null;
  categoriesList: CategoryItem[];
  cartIds: number[];
  favouriteIds: number[];
  sentOffers: OfferDetail[];
  receivedOffers: OfferDetail[];
  purchases: SaleDetail[];
  soldItems: SaleDetail[];
  isLoggedIn: boolean;
  authLoading: boolean;
  addToCart: (id: number) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  toggleFavourite: (id: number) => Promise<void>;
  setLoggedIn: (loggedIn: boolean) => void;
  setCurrentUser: (user: AuthUser | null) => void;
  refreshMarketplace: () => Promise<void>;
  openPaymentModal: (offer: OfferDetail) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within the PeerMart layout");
  return context;
}

function getUserInitials(user: AuthUser | null): string {
  if (!user) return "U";
  const first = (user.f_name || "").trim().charAt(0);
  const last = (user.l_name || "").trim().charAt(0);
  const combined = `${first}${last}`.toUpperCase();
  return combined || user.email.slice(0, 2).toUpperCase();
}

function useProtectedAction() {
  const { isLoggedIn } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  return (action: () => void) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    action();
  };
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, authLoading } = useCart();
  const location = useLocation();

  if (authLoading) {
    return <p className="container">Checking your session...</p>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}

const categories = [
  ["Books & Study Materials", "Notes, textbooks and guides", BookOpen, photos.books],
  ["Electronics & Gadgets", "Useful electronics and gadgets", Zap, photos.headphones],
  ["Clothing & Fashion", "Affordable clothing and fashion", PackageCheck, photos.shelf],
  ["Stationery & Academic Accessories", "Essential academic supplies", Bot, photos.calculator],
  ["Sports & Fitness", "Gear up without overspending", BadgeCheck, photos.sports],
  ["Daily Use & Hostel Essentials", "Everyday hostel essentials", HomeIcon, photos.lamp],
  ["Cycles & Accessories", "Your affordable campus commute", Bike, photos.cycle],
  ["Other", "More useful campus finds", Box, photos.shelf],
] as const;

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick} type={type} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}

function Logo({ compact = false, linked = true, to = "/" }: { compact?: boolean; linked?: boolean; to?: string }) {
  const content = (
    <>
      <span className="logo-mark"><Recycle size={22} /></span>
      {!compact && <span>PeerMart</span>}
    </>
  );
  return linked
    ? <Link to={to} className="logo" aria-label={to === "/admin" ? "PeerMart admin dashboard" : "PeerMart home"}>{content}</Link>
    : <span className="logo">{content}</span>;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const { cartIds, isLoggedIn, currentUser, receivedOffers, sentOffers } = useCart();
  const cartCount = cartIds.length;
  const pendingReceivedCount = receivedOffers.filter((o) => o.status === "pending").length;
  const acceptedSentCount = sentOffers.filter((o) => o.status === "accepted").length;
  const initials = getUserInitials(currentUser);
  const fullName = currentUser ? `${currentUser.f_name} ${currentUser.l_name}`.trim() : "My profile";

  const links = [
    ["Home", "/"],
    ["Conventional Search", "/browse"],
    ["AI Search", "/ai-search"],
    ["Favourites", "/favourites"],
    ["My Orders", "/orders"],
    ["My Sell", "/sells"],
  ];
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Logo />
        <nav className={open ? "nav-links is-open" : "nav-links"}>
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""} onClick={() => setOpen(false)}>
              {label === "Conventional Search" && <SlidersHorizontal size={15} />}
              {label === "AI Search" && <Sparkles size={15} />}
              {label}
              {label === "My Orders" && acceptedSentCount > 0 && (
                <span className="cart-dot" style={{ position: "static", marginLeft: 4 }} title="Accepted offers ready for payment">
                  {acceptedSentCount}
                </span>
              )}
              {label === "My Sell" && pendingReceivedCount > 0 && (
                <span className="cart-dot" style={{ position: "static", marginLeft: 4 }} title="New received offers">
                  {pendingReceivedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <Link to="/cart" className="icon-link" aria-label={`My cart with ${cartCount} items`}>
            <ShoppingCart size={19} />
            {cartCount > 0 && <span className="cart-dot">{cartCount}</span>}
          </Link>
          <Link to="/sell" className="btn btn-primary nav-sell"><Tag size={16} /> Sell an Item</Link>
          {isLoggedIn ? (
            <Link to="/profile" className="avatar" aria-label="My profile" title={fullName}>
              {initials}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-outline nav-login">Login / Register</Link>
          )}
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo linked={false} />
          <p>Your campus marketplace for affordable finds and sustainable living.</p>
          <div className="eco-note"><Leaf size={16} /> Built for students. Better for the planet.</div>
        </div>
        <div><h4>Marketplace</h4><Link to="/browse">Browse categories</Link><Link to="/ai-search">AI Search</Link><Link to="/sell">Sell an item</Link></div>
        <div><h4>PeerMart</h4><Link to="/terms">Terms & conditions</Link><Link to="/contact-admin">Contact Admin</Link></div>
        <div><h4>Need help?</h4><p>Contact your campus administrator</p><span className="muted">admin@iitdh.ac.in</span></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 PeerMart. Campus community marketplace.</span><span>Buy smart · Sell easy · Reuse more</span></div>
    </footer>
  );
}

function MockPaymentModal({
  offer,
  onClose,
  onCompleted,
}: {
  offer: OfferDetail;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MockPaymentResult | null>(null);

  const handleSimulate = async (outcome: "success" | "failed" | "cancelled") => {
    setProcessing(true);
    setError(null);
    try {
      const paymentResult = await processMockPaymentApi(offer.offer_id, outcome);
      setResult(paymentResult);
      await onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment simulation failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 540 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close payment modal"><X /></button>
        {!result || result.payment_status !== "success" ? (
          <>
            <span className="modal-icon"><ShieldCheck /></span>
            <span className="eyebrow">DEMO PAYMENT GATEWAY · ACADEMIC PROJECT</span>
            <h2>Complete Mock Payment</h2>
            <p>This is a simulated campus payment gateway for IIT Dharwad PeerMart. No real money or card details are collected.</p>
            <div className="modal-summary" style={{ marginBottom: 14 }}>
              {offer.listing_image && <img src={offer.listing_image} alt={offer.listing_title} />}
              <div>
                <strong>{offer.listing_title}</strong>
                <span>Listed price: ₹{Number(offer.listing_price).toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="info-grid" style={{ marginBottom: 16, textAlign: "left" }}>
              <div><span>Seller</span><strong>{offer.seller_name}</strong><small className="muted" style={{ display: "block" }}>{offer.seller_email}</small></div>
              <div><span>Buyer</span><strong>{offer.buyer_name}</strong><small className="muted" style={{ display: "block" }}>{offer.buyer_email}</small></div>
              <div><span>Accepted Offer Amount</span><strong style={{ fontSize: 18, color: "var(--emerald-700, #047857)" }}>₹{Number(offer.offered_price).toLocaleString("en-IN")}</strong></div>
              <div><span>Payment Method</span><strong>Demo / Mock Payment</strong></div>
            </div>
            {result && result.payment_status !== "success" && (
              <div className="notice" role="alert" style={{ marginBottom: 14 }}>
                <CircleHelp size={18} />
                <span>
                  Simulated payment <strong>{result.payment_status.toUpperCase()}</strong> (Ref: {result.payment_reference}). No sale was created and your accepted offer remains active.
                </span>
              </div>
            )}
            {error && (
              <div className="notice" role="alert" style={{ marginBottom: 14 }}>
                <CircleHelp size={18} />
                <span>{error}</span>
              </div>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              <Button
                className="full"
                disabled={processing}
                icon={<Check size={18} />}
                onClick={() => void handleSimulate("success")}
              >
                {processing ? "Processing..." : "Simulate Successful Payment"}
              </Button>
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  variant="outline"
                  className="full"
                  disabled={processing}
                  onClick={() => void handleSimulate("failed")}
                >
                  Simulate Failed Payment
                </Button>
                <Button
                  variant="ghost"
                  className="full"
                  disabled={processing}
                  onClick={() => void handleSimulate("cancelled")}
                >
                  Cancel Payment
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="modal-icon success"><Check /></span>
            <span className="eyebrow">PAYMENT STATUS: SUCCESS (SIMULATED)</span>
            <h2>Payment Completed!</h2>
            <p>Your purchase of <strong>{result.listing_title}</strong> has been recorded in MySQL and the listing is now marked Sold.</p>
            <div className="info-grid" style={{ marginBottom: 16, textAlign: "left" }}>
              <div><span>Receipt Number</span><strong>{result.receipt_number}</strong></div>
              <div><span>Payment Reference</span><strong>{result.payment_reference}</strong></div>
              <div><span>Sale ID</span><strong>#{result.sale_id}</strong></div>
              <div><span>Paid Amount</span><strong>₹{Number(result.amount).toLocaleString("en-IN")}</strong></div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {result.sale_id && (
                <Button
                  className="full"
                  icon={<Download size={18} />}
                  onClick={() => void downloadSaleReceiptPdf(result.sale_id!, result.receipt_number)}
                >
                  Download Receipt (PDF)
                </Button>
              )}
              {result.sale_id && (
                <Button
                  variant="outline"
                  className="full"
                  icon={<FileText size={18} />}
                  onClick={() => {
                    const saleId = result.sale_id;
                    onClose();
                    navigate(`/receipt?sale_id=${saleId}`);
                  }}
                >
                  View Receipt Details
                </Button>
              )}
              <Button variant="ghost" className="full" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const admin = location.pathname.startsWith("/admin");
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [cartIds, setCartIds] = useState<number[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<number[]>([]);
  const [sentOffers, setSentOffers] = useState<OfferDetail[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferDetail[]>([]);
  const [purchases, setPurchases] = useState<SaleDetail[]>([]);
  const [soldItems, setSoldItems] = useState<SaleDetail[]>([]);
  const [activePaymentOffer, setActivePaymentOffer] = useState<OfferDetail | null>(null);

  const loadUserRecords = useCallback(async () => {
    try {
      const [cIds, fIds, sent, received, bought, sold] = await Promise.all([
        getCartListingIds(),
        getFavouriteListingIds(),
        getSentOffersApi(),
        getReceivedOffersApi(),
        getMyPurchasesApi(),
        getMySoldItemsApi(),
      ]);
      setCartIds(cIds);
      setFavouriteIds(fIds);
      setSentOffers(sent);
      setReceivedOffers(received);
      setPurchases(bought);
      setSoldItems(sold);
    } catch {
      // Ignore transient errors when session expires
    }
  }, []);

  const refreshMarketplace = useCallback(async () => {
    try {
      const [items, cats] = await Promise.all([
        fetchProducts(categoryImages),
        fetchCategories(),
      ]);
      setProducts(items);
      setCategoriesList(cats);
      setProductsError("");
    } catch (error) {
      setProductsError(String(error));
    } finally {
      setProductsLoading(false);
    }
    if (isLoggedIn) {
      await loadUserRecords();
    }
  }, [isLoggedIn, loadUserRecords]);

  useEffect(() => {
    void refreshMarketplace();
  }, [refreshMarketplace]);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          setIsLoggedIn(true);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      getCurrentUser()
        .then((user) => setCurrentUser(user))
        .catch(() => {});
      void loadUserRecords();
    } else {
      setCurrentUser(null);
      setCartIds([]);
      setFavouriteIds([]);
      setSentOffers([]);
      setReceivedOffers([]);
      setPurchases([]);
      setSoldItems([]);
    }
  }, [isLoggedIn, loadUserRecords]);

  // Task I: Lightweight 5-second polling when tab is visible for multi-user synchronization
  useEffect(() => {
    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      fetchProducts(categoryImages)
        .then((items) => setProducts(items))
        .catch(() => {});
      if (isLoggedIn) {
        void loadUserRecords();
      }
    };

    const intervalId = window.setInterval(poll, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isLoggedIn, loadUserRecords]);

  const addToCart = async (id: number) => {
    try {
      await addCartItemApi(id);
      setCartIds((current) => (current.includes(id) ? current : [...current, id]));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not add item to cart");
    }
  };

  const removeFromCart = async (id: number) => {
    try {
      await removeCartItemApi(id);
      setCartIds((current) => current.filter((cartId) => cartId !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not remove item from cart");
    }
  };

  const toggleFavourite = async (id: number) => {
    try {
      if (favouriteIds.includes(id)) {
        await removeFavouriteApi(id);
        setFavouriteIds((current) => current.filter((favId) => favId !== id));
      } else {
        await addFavouriteApi(id);
        setFavouriteIds((current) => [...current, id]);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update favourites");
    }
  };

  const cart: CartContextValue = {
    currentUser,
    categoriesList,
    cartIds,
    favouriteIds,
    sentOffers,
    receivedOffers,
    purchases,
    soldItems,
    isLoggedIn,
    authLoading,
    addToCart,
    removeFromCart,
    toggleFavourite,
    setLoggedIn: setIsLoggedIn,
    setCurrentUser,
    refreshMarketplace,
    openPaymentModal: (offer: OfferDetail) => setActivePaymentOffer(offer),
  };

  return (
    <ProductsContext.Provider value={products}>
      <CartContext.Provider value={cart}>
        {!admin && <Navbar />}
        <main>
          {productsLoading && <p className="container">Loading marketplace listings...</p>}
          {productsError && <p className="container" role="alert">Could not load marketplace listings: {productsError}</p>}
          {!productsLoading && !productsError && <Outlet />}
        </main>
        {!admin && <Footer />}
        {activePaymentOffer && (
          <MockPaymentModal
            offer={activePaymentOffer}
            onClose={() => setActivePaymentOffer(null)}
            onCompleted={refreshMarketplace}
          />
        )}
      </CartContext.Provider>
    </ProductsContext.Provider>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>
      {action}
    </div>
  );
}

function StatusBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "blue" | "amber" | "slate" }) {
  return <span className={`status status-${tone}`}><span className="status-dot" />{children}</span>;
}

function offerTone(status: string): "green" | "blue" | "amber" | "slate" {
  const s = status.toLowerCase();
  if (s === "accepted" || s === "paid" || s === "completed") return "green";
  if (s === "pending") return "amber";
  return "slate";
}

function formatOfferStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "Paid";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ProductCard({ product }: { product: Product }) {
  const { favouriteIds, toggleFavourite } = useCart();
  const runProtectedAction = useProtectedAction();
  const liked = favouriteIds.includes(product.id);
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={`/product/${product.id}`}><img src={product.image} alt={product.title} className="product-image" /></Link>
        <button className={liked ? "heart liked" : "heart"} onClick={() => runProtectedAction(() => { void toggleFavourite(product.id); })} aria-label={liked ? "Remove from favourites" : "Add to favourites"}>
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        {product.status && <span className="image-status">{product.status}</span>}
      </div>
      <div className="product-content">
        <div className="product-meta"><span>{product.category}</span><span>·</span><span>{product.condition}</span></div>
        <Link to={`/product/${product.id}`}><h3>{product.title}</h3></Link>
        <div className="product-bottom"><strong>{product.price}</strong><Link to={`/product/${product.id}`}>View details <ArrowRight size={14} /></Link></div>
      </div>
    </article>
  );
}

function SearchBox({
  large = false,
  initialQuery = "",
  onSearch,
}: {
  large?: boolean;
  initialQuery?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const submittedQuery = query.trim() || "used textbooks under 1000";
    if (onSearch) {
      onSearch(submittedQuery);
      return;
    }
    navigate(`/ai-search?q=${encodeURIComponent(submittedQuery)}`);
  };
  return (
    <form className={large ? "smart-search smart-search-large" : "smart-search"} onSubmit={submit}>
      <Sparkles className="search-sparkle" size={20} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find used textbooks under ₹1,000 or a cycle…" aria-label="Search with AI" />
      <Button type="submit" icon={<Search size={18} />}>Search with AI</Button>
    </form>
  );
}

function HomePage() {
  const products = useProducts();
  const recentListings = [...products]
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.id - a.id;
    })
    .slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="pill"><span className="pulse" /> Your campus. Your marketplace.</div>
            <h1>Buy Smart.<br />Sell Easy. <span>Reuse More.</span></h1>
            <p className="hero-lead">Discover affordable second-hand essentials from students on your campus. Give your unused items a second life.</p>
            <SearchBox />
            <div className="hero-actions">
              <Link to="/browse" className="btn btn-outline"><ShoppingBag size={18} /> Browse all items</Link>
              <Link to="/sell" className="text-link">Sell something today <ArrowRight size={16} /></Link>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> Campus verified</span>
              <span><Leaf size={17} /> Sustainable by design</span>
              <span><Users size={17} /> Student-to-student</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo hero-photo-main"><img src={photos.cycle} alt="Cycle beside a student desk" /></div>
            <div className="hero-photo hero-photo-top"><img src={photos.books} alt="Second-hand textbooks" /></div>
            <div className="hero-photo hero-photo-bottom"><img src={photos.lamp} alt="Hostel study lamp" /></div>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeading eyebrow="Explore the campus" title="Browse by category" copy="Useful things, fair prices, and a shorter journey to find them." action={<Link to="/browse" className="text-link">View all categories <ArrowRight size={16} /></Link>} />
        <div className="category-grid">
          {categories.map(([title, copy, Icon, image]) => (
            <Link to={`/category/${({
              "Books & Study Materials": "books",
              "Electronics & Gadgets": "electronics",
              "Clothing & Fashion": "clothing",
              "Stationery & Academic Accessories": "stationery",
              "Sports & Fitness": "sports",
              "Daily Use & Hostel Essentials": "hostel",
              "Cycles & Accessories": "cycles",
              "Other": "other",
            } as Record<string, string>)[title]}`} className="category-card" key={title}>
              <img src={image} alt="" />
              <div className="category-overlay" />
              <span className="category-icon"><Icon size={20} /></span>
              <div><h3>{title}</h3><p>{copy}</p></div>
              <ArrowRight className="category-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" id="recent-listings">
        <SectionHeading
          eyebrow="Fresh on campus"
          title="Recent Listings"
          copy="Newest items added by students, ordered by most recent."
          action={<Link to="/browse" className="text-link">View all listings <ArrowRight size={16} /></Link>}
        />
        {recentListings.length > 0 ? (
          <div className="product-grid">
            {recentListings.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state soft">
            <span className="empty-icon"><ShoppingBag /></span>
            <h2>No listings yet</h2>
            <p>Check back soon or list an unused item on campus.</p>
          </div>
        )}
      </section>

      <section className="section container" id="how">
        <SectionHeading eyebrow="Simple & safe" title="How PeerMart works" copy="A straightforward way to find, connect, and reuse on campus." />
        <div className="steps">
          {[
            [Search, "Discover", "Search affordable products listed by fellow students on your campus."],
            [Mail, "Make an offer", "Submit an offer, get accepted by the seller, and connect via verified college email."],
            [Recycle, "Pay & reuse", "Complete the demo campus payment, download your official receipt, and reuse."],
          ].map(([Icon, title, copy], index) => {
            const StepIcon = Icon as typeof Search;
            return <div className="step" key={title as string}><span className="step-number">0{index + 1}</span><span className="step-icon"><StepIcon size={25} /></span><h3>{title as string}</h3><p>{copy as string}</p></div>;
          })}
        </div>
      </section>

      <section className="container sustain">
        <div className="sustain-icon"><Leaf size={34} /></div>
        <div><span className="eyebrow light">Small choices. Shared impact.</span><h2>One student’s unused item.<br />Another student’s perfect find.</h2><p>Every PeerMart exchange saves money, reduces waste, and strengthens your campus community.</p></div>
        <Link to="/browse" className="btn btn-secondary">Browse all items <ArrowRight size={17} /></Link>
      </section>
    </>
  );
}

function PageHero({ title, copy, eyebrow, children }: { title: string; copy: string; eyebrow?: string; children?: ReactNode }) {
  return <section className="page-hero"><div className="container">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{copy}</p>{children}</div></section>;
}

function FilterBar({
  keyword,
  category,
  minimumPrice,
  maximumPrice,
  condition,
  availableCategories,
  onKeywordChange,
  onCategoryChange,
  onMinimumPriceChange,
  onMaximumPriceChange,
  onConditionChange,
  onSearch,
  onClear,
}: {
  keyword: string;
  category: string;
  minimumPrice: string;
  maximumPrice: string;
  condition: string;
  availableCategories: string[];
  onKeywordChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMinimumPriceChange: (value: string) => void;
  onMaximumPriceChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <form
      className="filter-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))" }}
    >
      <label className="field">
        <span>Keyword</span>
        <div className="input-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Title, brand, color…"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Search keyword"
          />
        </div>
      </label>
      <label className="field">
        <span>Category</span>
        <div className="select-wrap">
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            <option value="All categories">All categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
      </label>
      <label className="field">
        <span>Min price</span>
        <div className="input-wrap">
          <span>₹</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={minimumPrice}
            onChange={(event) => onMinimumPriceChange(event.target.value)}
          />
        </div>
      </label>
      <label className="field">
        <span>Maximum price</span>
        <div className="input-wrap">
          <span>₹</span>
          <input
            type="number"
            min="0"
            placeholder="8,000"
            value={maximumPrice}
            onChange={(event) => onMaximumPriceChange(event.target.value)}
          />
        </div>
      </label>
      <label className="field">
        <span>Condition</span>
        <div className="select-wrap">
          <select value={condition} onChange={(event) => onConditionChange(event.target.value)}>
            <option value="All conditions">All conditions</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
          </select>
          <ChevronDown size={16} />
        </div>
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Button type="submit" icon={<Search size={17} />}>Search</Button>
        <Button type="button" variant="ghost" onClick={onClear}>Reset</Button>
      </div>
    </form>
  );
}

function BrowsePage() {
  const products = useProducts();
  const { categoriesList } = useCart();
  const [page, setPage] = useState(1);
  const pageSize = 16;
  const [sort, setSort] = useState("Newest");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("All categories");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [condition, setCondition] = useState("All conditions");
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    category: "All categories",
    minimumPrice: "",
    maximumPrice: "",
    condition: "All conditions",
  });

  const availableCategories =
    categoriesList.length > 0
      ? categoriesList.map((c) => c.category_name)
      : [...CANONICAL_CATEGORIES];

  const applyNow = () => {
    setAppliedFilters({ keyword, category, minimumPrice, maximumPrice, condition });
    setPage(1);
  };

  const clearAll = () => {
    setKeyword("");
    setCategory("All categories");
    setMinimumPrice("");
    setMaximumPrice("");
    setCondition("All conditions");
    setAppliedFilters({
      keyword: "",
      category: "All categories",
      minimumPrice: "",
      maximumPrice: "",
      condition: "All conditions",
    });
    setPage(1);
  };

  const visibleProducts = products
    .filter((product) => {
      const numericPrice = product.numericPrice ?? Number(product.price.replace(/[₹,]/g, ""));
      const matchesCategory =
        appliedFilters.category === "All categories" ||
        product.category.toLowerCase() === appliedFilters.category.toLowerCase() ||
        product.category.toLowerCase().includes(appliedFilters.category.toLowerCase());
      const matchesMinPrice =
        !appliedFilters.minimumPrice || numericPrice >= Number(appliedFilters.minimumPrice);
      const matchesMaxPrice =
        !appliedFilters.maximumPrice || numericPrice <= Number(appliedFilters.maximumPrice);
      const matchesCondition =
        appliedFilters.condition === "All conditions" ||
        product.condition === appliedFilters.condition;
      const kw = appliedFilters.keyword.trim().toLowerCase();
      const searchable = `${product.title} ${product.description ?? ""} ${product.brand ?? ""} ${product.color ?? ""} ${product.category}`.toLowerCase();
      const matchesKeyword = !kw || searchable.includes(kw);
      return matchesCategory && matchesMinPrice && matchesMaxPrice && matchesCondition && matchesKeyword;
    })
    .sort((first, second) => {
      if (sort === "Newest") {
        const aTime = first.createdAt ? Date.parse(first.createdAt) : 0;
        const bTime = second.createdAt ? Date.parse(second.createdAt) : 0;
        if (bTime !== aTime) return bTime - aTime;
        return second.id - first.id;
      }
      const firstPrice = first.numericPrice ?? Number(first.price.replace(/[₹,]/g, ""));
      const secondPrice = second.numericPrice ?? Number(second.price.replace(/[₹,]/g, ""));
      return sort === "Price: low to high" ? firstPrice - secondPrice : secondPrice - firstPrice;
    });

  const totalPages = Math.ceil(visibleProducts.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedProducts = visibleProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <>
      <PageHero eyebrow="Campus marketplace" title="Find your next campus essential" copy="Search by keyword, category, price range, or condition. Every listing is a unique item from a student seller." />
      <section className="container content-section">
        <FilterBar
          keyword={keyword}
          category={category}
          minimumPrice={minimumPrice}
          maximumPrice={maximumPrice}
          condition={condition}
          availableCategories={availableCategories}
          onKeywordChange={setKeyword}
          onCategoryChange={setCategory}
          onMinimumPriceChange={setMinimumPrice}
          onMaximumPriceChange={setMaximumPrice}
          onConditionChange={setCondition}
          onSearch={applyNow}
          onClear={clearAll}
        />
        <div className="results-head">
          <div>
            <h2>Campus listings</h2>
            <p>{visibleProducts.length} matching {visibleProducts.length === 1 ? "item" : "items"}</p>
          </div>
          <label className="sort">
            Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Newest</option>
              <option>Price: low to high</option>
              <option>Price: high to low</option>
            </select>
          </label>
        </div>
        {visibleProducts.length > 0 ? (
          <div className="product-grid">{paginatedProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div>
        ) : (
          <div className="empty-state soft">
            <span className="empty-icon"><Search /></span>
            <h2>No matching items</h2>
            <p>Try a different keyword, category, price range, or condition.</p>
            <Button onClick={clearAll}>Clear filters</Button>
          </div>
        )}
        {totalPages > 1 && (
          <nav aria-label="Listing pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 32 }}>
            <button
              className="btn btn-outline"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              className="btn btn-outline"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}

function AISearchPage() {
  const products = useProducts();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q")?.trim() ?? "";

  const [aiResult, setAiResult] = useState<AISearchResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setAiResult(null);
      setAiError(null);
      setAiLoading(false);
      return;
    }

    let active = true;
    setAiLoading(true);
    setAiError(null);

    runAiSearch(query)
      .then((res) => {
        if (active) setAiResult(res);
      })
      .catch((err) => {
        if (active) {
          setAiResult(null);
          setAiError(err instanceof Error ? err.message : "AI search failed");
        }
      })
      .finally(() => {
        if (active) setAiLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  const productsById = new Map(products.map((item) => [item.id, item]));
  const matchedProducts: Product[] = (aiResult?.items ?? []).map((item) => {
    const existing = productsById.get(item.listing_id);
    if (existing) return existing;
    const cond = item.item_condition.toLowerCase() === "new" ? "New" : "Used";
    const status =
      item.status.toLowerCase() === "sold"
        ? "Sold"
        : item.status.toLowerCase() === "reserved"
          ? "Reserved"
          : "Available";
    return {
      id: item.listing_id,
      title: item.title,
      description: item.description,
      price: `₹${Number(item.price).toLocaleString("en-IN")}`,
      condition: cond,
      category: aiResult?.interpreted_filters.category ?? "Other",
      image: categoryImages["Other"] ?? photos.shelf,
      status,
      createdAt: item.created_at,
    };
  });

  const filters = aiResult?.interpreted_filters;
  const budgetText =
    filters?.min_price && filters?.max_price
      ? `₹${Number(filters.min_price).toLocaleString("en-IN")} – ₹${Number(filters.max_price).toLocaleString("en-IN")}`
      : filters?.max_price
        ? `up to ₹${Number(filters.max_price).toLocaleString("en-IN")}`
        : filters?.min_price
          ? `from ₹${Number(filters.min_price).toLocaleString("en-IN")}`
          : "Any price";

  const runSearch = (searchQuery: string) =>
    navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}`);

  return (
    <>
      <section className="ai-hero">
        <div className="container ai-inner">
          <div className="ai-badge"><Sparkles size={18} /> PeerMart AI Search</div>
          <h1>Find what you need.<br /><span>Just describe it.</span></h1>
          <p>Skip the filters. Tell PeerMart what you’re looking for in ordinary words and we’ll find the closest campus matches.</p>
          <SearchBox large initialQuery={query} onSearch={runSearch} />
          <div className="query-chips">
            {[
              "Used textbooks under ₹1,000",
              "Bicycle below ₹7,000",
              "Scientific calculator Casio",
              "Wireless headphones or mouse",
            ].map((chip) => (
              <button onClick={() => runSearch(chip)} key={chip}>{chip}</button>
            ))}
          </div>
          <Link to="/browse" className="manual-link">Prefer manual filters? <strong>Use conventional search</strong></Link>
        </div>
      </section>
      <section className="container content-section">
        {query ? (
          aiLoading ? (
            <div className="empty-state soft">
              <span className="empty-icon"><Sparkles /></span>
              <h2>Interpreting your search...</h2>
              <p>Matching your request against live campus listings.</p>
            </div>
          ) : aiError ? (
            <div className="notice" role="alert">
              <CircleHelp size={18} />
              <span>{aiError}</span>
            </div>
          ) : aiResult ? (
            <>
              <div className="ai-interpret">
                <Bot size={22} />
                <div>
                  <strong>We understood:</strong>
                  <span>Category: {filters?.category ?? "Any category"}</span>
                  <span>Budget: {budgetText}</span>
                  <span>Condition: {filters?.condition ? (filters.condition === "new" ? "New" : "Used") : "Any"}</span>
                  {filters?.keywords?.length ? <span>Keywords: {filters.keywords.join(", ")}</span> : null}
                </div>
              </div>
              {aiResult.fallback_used && aiResult.fallback_reason && (
                <div className="notice" style={{ marginBottom: 20 }}>
                  <CircleHelp size={18} />
                  <span>{aiResult.fallback_reason}</span>
                </div>
              )}
              <div className="results-head">
                <div>
                  <h2>Best matches for you</h2>
                  <p>{matchedProducts.length} {matchedProducts.length === 1 ? "listing matches" : "listings match"} “{query}”</p>
                </div>
              </div>
              {matchedProducts.length > 0 ? (
                <div className="product-grid">{matchedProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div>
              ) : (
                <div className="empty-state soft"><span className="empty-icon"><Search /></span><h2>No close matches found</h2><p>Try fewer words, a higher budget, or continue with manual filters.</p><Link to="/browse" className="btn btn-primary">Go to conventional search</Link></div>
              )}
            </>
          ) : null
        ) : (
          <div className="empty-state soft"><span className="empty-icon"><Sparkles /></span><h2>Your matches will appear here</h2><p>Try a complete thought like “used textbooks under ₹1,000” for better results.</p></div>
        )}
      </section>
    </>
  );
}

function CategoryPage() {
  const products = useProducts();
  const { slug = "cycles" } = useParams();
  const categoryDetails: Record<string, { title: string; category: string; copy: string }> = {
    books: { title: "Books & Study Materials", category: "Books & Study Materials", copy: "Find textbooks, notes, guides, and reference materials shared by IIT DH students." },
    electronics: { title: "Electronics & Gadgets", category: "Electronics & Gadgets", copy: "Browse useful devices and gadgets that still have plenty to give." },
    cycles: { title: "Cycles & Accessories", category: "Cycles & Accessories", copy: "Browse pre-loved cycles from students nearby—affordable, practical, and ready for another ride." },
    hostel: { title: "Daily Use & Hostel Essentials", category: "Daily Use & Hostel Essentials", copy: "Make hostel life easier with practical items from students on campus." },
    clothing: { title: "Clothing & Fashion", category: "Clothing & Fashion", copy: "Explore clothing, backpacks, and fashion items from students." },
    stationery: { title: "Stationery & Academic Accessories", category: "Stationery & Academic Accessories", copy: "Find calculators, drawing boards, and academic accessories." },
    sports: { title: "Sports & Fitness", category: "Sports & Fitness", copy: "Get active with affordable sports gear from fellow students." },
    other: { title: "Other Items", category: "Other", copy: "Discover more useful campus finds that do not fit the usual categories." },
  };
  const details = categoryDetails[slug] ?? categoryDetails.cycles;
  const [maximumPrice, setMaximumPrice] = useState("");
  const [condition, setCondition] = useState("All conditions");
  const [appliedMaximum, setAppliedMaximum] = useState("");
  const [appliedCondition, setAppliedCondition] = useState("All conditions");
  const categoryProducts = products.filter((product) => product.category === details.category);
  const visibleProducts = categoryProducts.filter((product) => {
    const numericPrice = product.numericPrice ?? Number(product.price.replace(/[₹,]/g, ""));
    const matchesPrice = !appliedMaximum || numericPrice <= Number(appliedMaximum);
    const matchesCondition = appliedCondition === "All conditions" || product.condition === appliedCondition;
    return matchesPrice && matchesCondition;
  });
  const clearFilters = () => {
    setMaximumPrice("");
    setCondition("All conditions");
    setAppliedMaximum("");
    setAppliedCondition("All conditions");
  };

  return (
    <>
      <PageHero eyebrow={details.title} title={`Explore ${details.title}`} copy={details.copy} />
      <section className="container content-section">
        <div className="category-filter-card">
          <div className="category-filter-title"><SlidersHorizontal size={19} /><div><strong>Filter {details.title}</strong><span>This category is already selected.</span></div></div>
          <label className="field"><span>Maximum price</span><div className="input-wrap"><span>₹</span><input type="number" min="0" placeholder="No limit" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} /></div></label>
          <label className="field"><span>Condition</span><div className="select-wrap"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option>All conditions</option><option>New</option><option>Used</option></select><ChevronDown size={16} /></div></label>
          <Button onClick={() => { setAppliedMaximum(maximumPrice); setAppliedCondition(condition); }}>Apply Filters</Button>
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
        <div className="results-head"><div><h2>{details.title} listings</h2><p>{visibleProducts.length} unique {visibleProducts.length === 1 ? "listing" : "listings"}</p></div></div>
        {visibleProducts.length > 0 ? (
          <div className="product-grid">{visibleProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div>
        ) : (
          <div className="empty-state soft"><span className="empty-icon"><Search /></span><h2>No matching items</h2><p>Try clearing the price or condition filters to see more listings in this category.</p><Button onClick={clearFilters}>Clear filters</Button></div>
        )}
      </section>
    </>
  );
}

function ProductPage() {
  const products = useProducts();
  const { id } = useParams();
  const product = products.find((item) => item.id === Number(id)) ?? products[0];
  const {
    currentUser,
    cartIds,
    favouriteIds,
    sentOffers,
    addToCart,
    toggleFavourite,
    refreshMarketplace,
    openPaymentModal,
  } = useCart();
  const runProtectedAction = useProtectedAction();

  const [imageIndex, setImageIndex] = useState(0);
  const [offerModal, setOfferModal] = useState<"idle" | "form" | "sent">("idle");
  const [offerPriceInput, setOfferPriceInput] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [createdOffer, setCreatedOffer] = useState<OfferDetail | null>(null);

  useEffect(() => {
    setImageIndex(0);
    if (product) {
      const numeric = product.numericPrice ?? Number(product.price.replace(/[₹,]/g, ""));
      setOfferPriceInput(String(numeric));
    }
  }, [product?.id]);

  if (!product) {
    return (
      <section className="container content-section">
        <div className="empty-state soft">
          <h2>Listing not found</h2>
          <Link to="/browse" className="btn btn-primary">Back to marketplace</Link>
        </div>
      </section>
    );
  }

  const galleryImages = (
    product.images?.length ? product.images : [product.image]
  ).map((src, index) => ({
    src,
    alt: `${product.title} product view ${index + 1}`,
  }));

  const isOwnListing = Boolean(
    currentUser && product.sellerId && currentUser.user_id === product.sellerId,
  );
  const activeOffer = sentOffers.find(
    (o) =>
      o.listing_id === product.id &&
      ["pending", "accepted", "paid"].includes(o.status.toLowerCase()),
  );
  const latestOfferForProduct =
    activeOffer ?? sentOffers.find((o) => o.listing_id === product.id);

  const inCart = cartIds.includes(product.id);
  const liked = favouriteIds.includes(product.id);
  const canPurchase = product.status === "Available" && !isOwnListing;

  const submitOffer = async (event: FormEvent) => {
    event.preventDefault();
    setOfferError(null);
    const amount = Number(offerPriceInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setOfferError("Please enter a valid positive offer amount in INR.");
      return;
    }
    setOfferSubmitting(true);
    try {
      const created = await createOfferApi(product.id, amount);
      setCreatedOffer(created);
      setOfferModal("sent");
      await refreshMarketplace();
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : "Failed to submit offer");
    } finally {
      setOfferSubmitting(false);
    }
  };

  return (
    <section className="container product-page">
      <Link to="/browse" className="back-link"><ArrowLeft size={17} /> Back to listings</Link>
      <div className="product-detail">
        <div className="gallery">
          <div className="main-image">
            <img src={galleryImages[imageIndex]?.src ?? product.image} alt={galleryImages[imageIndex]?.alt ?? product.title} />
            <span className="gallery-count">{imageIndex + 1} / {galleryImages.length}</span>
            <button className="gallery-prev" onClick={() => setImageIndex((imageIndex - 1 + galleryImages.length) % galleryImages.length)} aria-label="Previous product image"><ArrowLeft /></button>
            <button className="gallery-next" onClick={() => setImageIndex((imageIndex + 1) % galleryImages.length)} aria-label="Next product image"><ArrowRight /></button>
          </div>
          <div className="thumbnails">
            {galleryImages.map((image, index) => (
              <button className={imageIndex === index ? "selected" : ""} onClick={() => setImageIndex(index)} aria-label={`View image ${index + 1}`} key={`${image.src}-${index}`}>
                <img src={image.src} alt={image.alt} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-copy">
          <div className="detail-topline">
            <StatusBadge tone={product.status === "Available" ? "green" : product.status === "Reserved" ? "amber" : "slate"}>
              {product.status ?? "Available"}
            </StatusBadge>
          </div>
          <h1>{product.title}</h1>
          <div className="detail-price">{product.price} {product.status === "Available" && <span>Negotiable</span>}</div>
          <div className="detail-tags">
            <span><Tag size={16} /> {product.category}</span>
            <span><BadgeCheck size={16} /> {product.condition}</span>
            {product.brand && <span>Brand: {product.brand}</span>}
            {product.color && <span>Color: {product.color}</span>}
          </div>
          <div className="detail-section">
            <h3>About this item</h3>
            <p>{product.description || "No description provided."}</p>
          </div>
          <div className="seller-card">
            <ShieldCheck size={20} />
            <strong>Seller: {product.sellerName || "Verified Campus Seller"}</strong>
          </div>

          {isOwnListing && (
            <div className="notice" style={{ marginBottom: 14 }}>
              <Store size={18} />
              <span>This is your listing. <Link to="/sells"><strong>Manage it in My Sell</strong></Link>.</span>
            </div>
          )}

          {latestOfferForProduct && (
            <div className="notice" style={{ marginBottom: 14 }}>
              <Clock3 size={18} />
              <div>
                <strong>Your Offer: ₹{Number(latestOfferForProduct.offered_price).toLocaleString("en-IN")}</strong>{" "}
                — Status: <StatusBadge tone={offerTone(latestOfferForProduct.status)}>{formatOfferStatus(latestOfferForProduct.status)}</StatusBadge>
                {latestOfferForProduct.status === "accepted" && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "4px 0" }}>Seller contact: <strong>{latestOfferForProduct.seller_email}</strong></p>
                    <Button onClick={() => openPaymentModal(latestOfferForProduct)} icon={<ClipboardCheck size={16} />}>
                      Proceed to Payment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="offer-actions">
            <Button
              className="grow"
              icon={activeOffer ? <Check size={18} /> : <Mail size={18} />}
              onClick={() =>
                runProtectedAction(() => {
                  setOfferError(null);
                  setOfferModal("form");
                })
              }
              disabled={Boolean(activeOffer) || !canPurchase}
            >
              {isOwnListing
                ? "Your Listing"
                : activeOffer
                  ? `Offer ${formatOfferStatus(activeOffer.status)}`
                  : "Make Offer"}
            </Button>
            <Button
              variant="outline"
              icon={inCart ? <Check size={18} /> : <ShoppingCart size={18} />}
              onClick={() => runProtectedAction(() => { void addToCart(product.id); })}
              disabled={inCart || !canPurchase}
            >
              {inCart ? "Added to Cart" : "Add to Cart"}
            </Button>
            <button
              className={liked ? "detail-heart liked" : "detail-heart"}
              onClick={() => runProtectedAction(() => { void toggleFavourite(product.id); })}
              aria-label={liked ? "Remove from favourites" : "Add to favourites"}
              title={liked ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart fill={liked ? "currentColor" : "none"} size={19} />
            </button>
          </div>
          <div className="safety-note"><ShieldCheck size={20} /><p><strong>Deal safely on campus.</strong> Submit an offer, negotiate with the student seller, and complete the simulated campus payment once accepted.</p></div>
          <div style={{ marginTop: 12 }}>
            <Link to={`/contact-admin?listing_id=${product.id}`} className="text-link">
              <Mail size={15} /> Report or contact admin about this listing <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {offerModal !== "idle" && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setOfferModal("idle")} aria-label="Close modal"><X /></button>
            {offerModal === "form" ? (
              <form onSubmit={(e) => void submitOffer(e)}>
                <span className="modal-icon"><Mail /></span>
                <h2>Make an Offer</h2>
                <p>Enter your proposed price for this item. The seller will be able to accept or reject your offer.</p>
                <div className="modal-summary">
                  <img src={product.image} alt={product.title} />
                  <div>
                    <strong>{product.title}</strong>
                    <span>Listed price: {product.price}</span>
                  </div>
                </div>
                <label className="field" style={{ marginTop: 14, textAlign: "left" }}>
                  <span>Your Offer Price (INR) *</span>
                  <div className="input-wrap">
                    <span>₹</span>
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={offerPriceInput}
                      onChange={(e) => setOfferPriceInput(e.target.value)}
                      placeholder="Enter offer amount"
                      aria-label="Offer price"
                    />
                  </div>
                </label>
                {offerError && (
                  <div className="notice" role="alert" style={{ marginTop: 12 }}>
                    <CircleHelp size={18} />
                    <span>{offerError}</span>
                  </div>
                )}
                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <Button variant="outline" onClick={() => setOfferModal("idle")}>Cancel</Button>
                  <Button type="submit" disabled={offerSubmitting}>
                    {offerSubmitting ? "Submitting..." : "Submit Offer"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <span className="modal-icon success"><Check /></span>
                <h2>Offer Submitted!</h2>
                <p>Your offer of <strong>₹{Number(createdOffer?.offered_price ?? offerPriceInput).toLocaleString("en-IN")}</strong> for <strong>{product.title}</strong> has been recorded with status <strong>Pending</strong>.</p>
                <div className="contact-box">
                  <Mail size={19} />
                  <div>
                    <small>Seller’s verified college email ({createdOffer?.seller_name || product.sellerName})</small>
                    <strong>{createdOffer?.seller_email}</strong>
                  </div>
                </div>
                <div className="notice">
                  <Clock3 size={18} />
                  <span>Track this offer under <strong>My Offers / Negotiating</strong> in your Profile or Orders page.</span>
                </div>
                <div className="modal-actions">
                  <Link to="/profile" className="btn btn-primary full">Go to My Profile</Link>
                  <Link to="/orders" className="btn btn-outline full">Go to My Orders</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AuthShell({ register = false }: { register?: boolean }) {
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reenteredPassword, setReenteredPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoggedIn, setCurrentUser } = useCart();
  const returnTo = (location.state as { from?: string } | null)?.from ?? (register ? "/profile" : "/");

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@iitdh.ac.in")) {
      setAuthError("Use a valid IIT Dharwad email address ending in @iitdh.ac.in.");
      return;
    }

    if (register) {
      if (password.length < 8) {
        setAuthError("Password must contain at least 8 characters.");
        return;
      }

      if (password !== reenteredPassword) {
        setAuthError("The passwords do not match.");
        return;
      }

      if (!accepted) {
        setAuthError("Please accept the Terms and Conditions.");
        return;
      }

      try {
        const user = await apiRegister({
          f_name: firstName.trim(),
          l_name: lastName.trim(),
          email: normalizedEmail,
          password,
          gender: gender || null,
          phone_no: phone.trim() || null,
          terms_accepted: accepted,
        });

        setCurrentUser(user);
        setLoggedIn(true);
        navigate(returnTo, { replace: true });
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
        );
      }

      return;
    }

    try {
      const user = await apiLogin(normalizedEmail, password);

      setCurrentUser(user);
      setLoggedIn(true);

      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
    }
  };

  return (
    <section className="auth-page">
      <div className={register ? "auth-card auth-wide" : "auth-card"}>
        <Logo />
        <div className="auth-title"><h1>{register ? "Join your campus marketplace" : "Welcome to PeerMart"}</h1><p>{register ? "Create an account with your college email." : "Sign in to your campus marketplace account."}</p></div>
        <form onSubmit={submitAuth} className="form-stack">
          {register && <div className="form-row"><label className="field"><span>First name</span><input required placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="field"><span>Last name</span><input required placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label></div>}
          {register && <div className="form-row"><label className="field"><span>Gender</span><div className="select-wrap"><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select><ChevronDown size={16} /></div></label><label className="field"><span>Phone number</span><input required placeholder="9876543210" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>}
          <label className="field"><span>College email ID</span><div className="input-icon"><Mail size={17} /><input required type="email" placeholder="name@iitdh.ac.in" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label className="field"><span>Password</span><div className="password-wrap"><input required minLength={8} type={show ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {register && <label className="field"><span>Re-enter password</span><input required minLength={8} type={show ? "text" : "password"} placeholder="Repeat password" value={reenteredPassword} onChange={(event) => setReenteredPassword(event.target.value)} /></label>}
          {register && <label className="check-row"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>I agree to the <Link to="/terms">Terms and Conditions</Link> and campus community rules.</span></label>}
          {authError && <div className="auth-error" role="alert"><CircleHelp size={17} /><span>{authError}</span></div>}
          {!register && <div className="form-helper"><label className="check-row"><input type="checkbox" /><span>Remember me</span></label><button type="button" onClick={() => { setResetSent(false); setForgotPassword(true); }}>Forgot password?</button></div>}
          <Button type="submit" className="full" disabled={register && !accepted}>{register ? "Create account" : "Sign in"}</Button>
        </form>

        <p className="auth-switch">{register ? "Already have an account?" : "New to PeerMart?"} <Link to={register ? "/login" : "/register"} state={location.state}>{register ? "Sign in" : "Register"}</Link></p>
      </div>
      <div className="auth-aside"><div><Leaf size={28} /><h2>Good for your wallet.<br />Better for your campus.</h2><p>Join students finding useful things and giving great items a second life.</p></div></div>
      {forgotPassword && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setForgotPassword(false)}><X /></button>
            {!resetSent ? (
              <form className="password-reset-form" onSubmit={(event) => { event.preventDefault(); setResetSent(true); }}>
                <span className="modal-icon"><Mail /></span>
                <h2>Reset your password</h2>
                <p>Enter your IIT Dharwad email address. We’ll prepare password reset instructions for your account.</p>
                <label className="field"><span>College email ID</span><div className="input-icon"><Mail size={17} /><input required type="email" pattern=".+@iitdh\.ac\.in" placeholder="name@iitdh.ac.in" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} /></div><small>Use your verified @iitdh.ac.in email.</small></label>
                <Button type="submit" className="full">Send reset instructions</Button>
                <Button variant="ghost" className="full" onClick={() => setForgotPassword(false)}>Back to login</Button>
              </form>
            ) : (
              <div className="password-reset-success">
                <span className="modal-icon success"><Check /></span>
                <h2>Check your email</h2>
                <p>Password reset instructions have been requested for <strong>{resetEmail}</strong>.</p>
                <div className="notice"><CircleHelp size={18} /><span>This prototype does not send real email. In the implemented system, the secure reset link would be delivered to this IIT DH address.</span></div>
                <Button className="full" onClick={() => setForgotPassword(false)}>Return to login</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SellPage() {
  const { categoriesList, refreshMarketplace } = useCart();
  const [publishedId, setPublishedId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"used" | "new">("used");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const next = [...selectedFiles, ...Array.from(files)].slice(0, 5);
    setSelectedFiles(next);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Please enter a valid positive price.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createListingApi({
        category_id: Number(categoryId),
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        item_condition: condition,
        brand: brand.trim() || null,
        color: color.trim() || null,
      });

      for (let idx = 0; idx < selectedFiles.length; idx += 1) {
        await uploadListingImageFile(created.listing_id, selectedFiles[idx], idx + 1);
      }

      await refreshMarketplace();
      setPublishedId(created.listing_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (publishedId !== null) {
    return (
      <section className="container content-section">
        <div className="success-panel">
          <span><Check /></span>
          <h1>Your listing is live!</h1>
          <p>Students can now discover your item and submit offers directly on PeerMart.</p>
          <div>
            <Link className="btn btn-primary" to={`/product/${publishedId}`}>View listing</Link>
            <Link className="btn btn-outline" to="/sells">Manage my listings</Link>
            <Button
              variant="ghost"
              onClick={() => {
                setPublishedId(null);
                setTitle("");
                setDescription("");
                setPrice("");
                setBrand("");
                setColor("");
                setSelectedFiles([]);
              }}
            >
              List another item
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero eyebrow="Sell on PeerMart" title="List your item" copy="Give something useful a second life. Clear photos and honest details help your item sell faster." />
      <section className="container form-layout">
        <form className="listing-form" onSubmit={(e) => void handlePublish(e)}>
          {error && (
            <div className="notice" role="alert" style={{ marginBottom: 16 }}>
              <CircleHelp size={18} />
              <span>{error}</span>
            </div>
          )}
          <div className="form-section">
            <div className="form-section-title"><span>1</span><div><h2>Item details</h2><p>Tell students what you’re offering.</p></div></div>
            <label className="field">
              <span>Category *</span>
              <div className="select-wrap">
                <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Choose a category</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.category_id} value={String(cat.category_id)}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <label className="field">
              <span>Product title *</span>
              <input
                required
                minLength={2}
                maxLength={200}
                placeholder="e.g. Urban commuter cycle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <small>Use a clear, specific title.</small>
            </label>
            <label className="field">
              <span>Description *</span>
              <textarea
                required
                minLength={2}
                rows={5}
                placeholder="Describe condition, age, features, and any signs of use…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <small>Be honest about marks or defects.</small>
            </label>
            <div className="form-row">
              <label className="field">
                <span>Listed price *</span>
                <div className="input-wrap">
                  <span>₹</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </label>
              <fieldset className="field">
                <legend>Condition *</legend>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="condition"
                      checked={condition === "used"}
                      onChange={() => setCondition("used")}
                    />{" "}
                    Used
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="condition"
                      checked={condition === "new"}
                      onChange={() => setCondition("new")}
                    />{" "}
                    New
                  </label>
                </div>
              </fieldset>
            </div>
            <div className="form-row">
              <label className="field">
                <span>Brand (optional)</span>
                <input
                  placeholder="e.g. Casio, Hero, Boat"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Color (optional)</span>
                <input
                  placeholder="e.g. Black, Blue"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title"><span>2</span><div><h2>Add product photos</h2><p>Upload up to 5 clear images (JPG, PNG, WEBP).</p></div></div>
            <label className="upload-zone">
              <UploadCloud size={30} />
              <strong>Drop photos here or click to browse</strong>
              <span>JPG, PNG, or WEBP · up to 5 photos</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
              />
            </label>
            {selectedFiles.length > 0 && (
              <div className="upload-preview">
                {selectedFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`}>
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    {idx === 0 && <span className="cover-label">Cover</span>}
                    <button type="button" onClick={() => removeSelectedFile(idx)} aria-label={`Remove ${file.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="submit-row">
            <Link to="/" className="btn btn-ghost">Cancel</Link>
            <Button type="submit" disabled={submitting} icon={<UploadCloud size={18} />}>
              {submitting ? "Publishing..." : "Publish listing"}
            </Button>
          </div>
        </form>
        <aside className="form-tips">
          <h3><Sparkles size={18} /> Tips for a great listing</h3>
          <ul>
            <li><Check /> Use bright, clear photos</li>
            <li><Check /> Mention any defects</li>
            <li><Check /> Set a fair student price</li>
            <li><Check /> Respond promptly to student offers</li>
          </ul>
          <div className="eco-tip"><Leaf /><strong>Why reuse?</strong><p>Every item sold keeps useful materials in circulation and helps another student spend less.</p></div>
        </aside>
      </section>
    </>
  );
}

function DashboardShell({ title, copy, children }: { title: string; copy: string; children: ReactNode }) {
  return (
    <>
      <PageHero title={title} copy={copy} />
      <section className="container dashboard-content">
        <aside className="account-nav">
          {[
            ["Profile", "/profile", User],
            ["My orders", "/orders", ShoppingBag],
            ["My Sell", "/sells", Store],
            ["Favourites", "/favourites", Heart],
            ["My cart", "/cart", ShoppingCart],
          ].map(([label, to, Icon]) => {
            const I = Icon as typeof User;
            return (
              <NavLink to={to as string} key={label as string}>
                <I size={18} />
                {label as string}
              </NavLink>
            );
          })}
        </aside>
        <div className="dashboard-main">{children}</div>
      </section>
    </>
  );
}

function EditListingModal({
  listing,
  onClose,
  onSaved,
}: {
  listing: Product;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(String(listing.numericPrice ?? Number(listing.price.replace(/[₹,]/g, ""))));
  const [condition, setCondition] = useState<"used" | "new">(listing.condition === "New" ? "new" : "used");
  const [description, setDescription] = useState(listing.description ?? "");
  const [brand, setBrand] = useState(listing.brand ?? "");
  const [color, setColor] = useState(listing.color ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateListingApi(listing.id, {
        title: title.trim(),
        price: Number(price),
        item_condition: condition,
        description: description.trim(),
        brand: brand.trim() || null,
        color: color.trim() || null,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadListingImageFile(listing.id, file);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (imageId: number) => {
    setSaving(true);
    setError(null);
    try {
      await deleteListingImageApi(imageId);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setSaving(false);
    }
  };

  const handleMakeCover = async (imageId: number) => {
    setSaving(true);
    setError(null);
    try {
      await updateListingImageOrderApi(imageId, 1);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder photo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal edit-listing-modal" onSubmit={(e) => void handleSave(e)} style={{ maxWidth: 600 }}>
        <button type="button" className="modal-close" onClick={onClose}><X /></button>
        <span className="modal-icon"><Tag /></span>
        <h2>Edit listing</h2>
        <p>Update the item information and photos students see in search results.</p>
        {error && (
          <div className="notice" role="alert" style={{ marginBottom: 12 }}>
            <CircleHelp size={18} />
            <span>{error}</span>
          </div>
        )}
        <label className="field">
          <span>Product title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="form-row">
          <label className="field">
            <span>Price</span>
            <div className="input-wrap">
              <span>₹</span>
              <input required type="number" min="1" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>Condition</span>
            <div className="select-wrap">
              <select value={condition} onChange={(e) => setCondition(e.target.value as "used" | "new")}>
                <option value="used">Used</option>
                <option value="new">New</option>
              </select>
              <ChevronDown />
            </div>
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            <span>Brand</span>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label className="field">
            <span>Color</span>
            <input value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="field" style={{ textAlign: "left" }}>
          <span>Photos ({listing.imageRecords?.length ?? 0})</span>
          {listing.imageRecords && listing.imageRecords.length > 0 && (
            <div className="upload-preview" style={{ marginTop: 8 }}>
              {listing.imageRecords.map((rec, idx) => (
                <div key={rec.image_id}>
                  <img src={rec.image_path} alt="" />
                  {idx === 0 ? (
                    <span className="cover-label">Cover</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleMakeCover(rec.image_id)}
                      title="Set as cover image"
                      style={{ left: 6, right: "auto", fontSize: 10, padding: "2px 6px", width: "auto" }}
                    >
                      Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeletePhoto(rec.image_id)}
                    aria-label="Delete photo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="btn btn-outline" style={{ marginTop: 8, cursor: "pointer", display: "inline-flex" }}>
            <UploadCloud size={16} /> Upload photo
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              multiple
              style={{ display: "none" }}
              onChange={(e) => void handleUploadPhoto(e.target.files)}
            />
          </label>
        </div>

        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const products = useProducts();
  const {
    currentUser,
    setCurrentUser,
    setLoggedIn,
    sentOffers,
    receivedOffers,
    purchases,
    soldItems,
    favouriteIds,
    refreshMarketplace,
    openPaymentModal,
  } = useCart();

  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Product | null>(null);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (currentUser) {
      setProfile({
        firstName: currentUser.f_name,
        lastName: currentUser.l_name,
        phone: currentUser.phone_no ?? "",
      });
    }
  }, [currentUser]);

  const myListings = products.filter(
    (item) => currentUser && item.sellerId === currentUser.user_id,
  );
  const myNegotiatingOffers = sentOffers.filter((o) =>
    ["pending", "rejected", "cancelled"].includes(o.status),
  );
  const myAcceptedOffers = sentOffers.filter((o) => o.status === "accepted");
  const sellerPendingOrPastOffers = receivedOffers.filter((o) =>
    ["pending", "rejected", "cancelled"].includes(o.status),
  );
  const sellerAcceptedAwaitingPayment = receivedOffers.filter(
    (o) => o.status === "accepted",
  );
  const allReceipts = [
    ...purchases.map((s) => ({ ...s, roleLabel: "Buyer" as const })),
    ...soldItems.map((s) => ({ ...s, roleLabel: "Seller" as const })),
  ].sort((a, b) => Date.parse(b.sold_at) - Date.parse(a.sold_at));

  const openEditor = () => {
    setDraft(profile);
    setSaved(false);
    setEditing(true);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();

    if (!/^[6-9][0-9]{9}$/.test(draft.phone.trim())) {
      window.alert("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    try {
      const updated = await apiUpdateProfile({
        f_name: draft.firstName.trim(),
        l_name: draft.lastName.trim(),
        phone_no: draft.phone.trim(),
      });

      setCurrentUser(updated);
      setProfile({
        firstName: updated.f_name,
        lastName: updated.l_name,
        phone: updated.phone_no ?? "",
      });
      setEditing(false);
      setSaved(true);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Profile update failed",
      );
    }
  };

  const handleOfferAction = async (
    offerId: number,
    status: "accepted" | "rejected" | "cancelled",
  ) => {
    try {
      await updateOfferStatusApi(offerId, status);
      setActionMessage(`Offer marked as ${status}.`);
      await refreshMarketplace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update offer");
    }
  };

  const handleDeleteListing = async (listing: Product) => {
    try {
      await deleteListingApi(listing.id);
      setActionMessage(`Removed listing "${listing.title}".`);
      await refreshMarketplace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete listing");
    }
  };

  const initials = getUserInitials(currentUser);

  return (
    <DashboardShell title="My profile" copy="Manage your account, negotiations, listings, and receipts.">
      {saved && <div className="save-confirmation"><Check size={17} /> Profile updated successfully.</div>}
      {actionMessage && (
        <div className="save-confirmation" role="status">
          <Check size={17} /> {actionMessage}
        </div>
      )}
      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h2>{profile.firstName} {profile.lastName}</h2>
            <p><ShieldCheck size={15} /> Verified campus member</p>
          </div>
          <Button variant="outline" onClick={openEditor}>Edit profile</Button>
        </div>
        <div className="info-grid">
          <div><span>College email</span><strong>{currentUser?.email ?? "Loading..."}</strong></div>
          <div><span>Phone number</span><strong>{profile.phone || "Not set"}</strong></div>
        </div>
      </div>

      <div className="dashboard-cards">
        <Link to="/orders"><ShoppingBag /><strong>My orders</strong><span>{sentOffers.filter((o) => o.status === "pending" || o.status === "accepted").length} active negotiations</span></Link>
        <Link to="/sells"><Store /><strong>My Sell</strong><span>{myListings.length} listings · {receivedOffers.filter((o) => o.status === "pending").length} pending offers</span></Link>
        <Link to="/favourites"><Heart /><strong>Favourites</strong><span>{favouriteIds.length} saved items</span></Link>
      </div>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>My Listings</h2>
            <p>Products you have listed on PeerMart</p>
          </div>
          <Link to="/sell" className="btn btn-primary"><Tag size={15} /> Add Listing</Link>
        </div>
        {myListings.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myListings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-product">
                      <img src={item.image} alt="" />
                      <Link to={`/product/${item.id}`}><strong>{item.title}</strong></Link>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.price}</td>
                  <td>
                    <StatusBadge tone={item.status === "Available" ? "green" : item.status === "Reserved" ? "amber" : "slate"}>
                      {item.status ?? "Available"}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="table-actions">
                      {item.status !== "Sold" && (
                        <>
                          <button className="table-view" onClick={() => setEditingListing(item)}>Edit</button>
                          <button className="table-delete" onClick={() => void handleDeleteListing(item)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">You haven’t created any listings yet.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Accepted Offers</h2>
            <p>Seller accepted your offer — proceed to mock payment to complete the purchase</p>
          </div>
          <strong className="panel-count">{myAcceptedOffers.length}</strong>
        </div>
        {myAcceptedOffers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller Contact</th>
                <th>Accepted Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myAcceptedOffers.map((off) => (
                <tr key={off.offer_id}>
                  <td>
                    <div className="table-product">
                      {off.listing_image && <img src={off.listing_image} alt="" />}
                      <div>
                        <Link to={`/product/${off.listing_id}`}><strong>{off.listing_title}</strong></Link>
                        <div className="muted" style={{ fontSize: 12 }}>Listed: ₹{Number(off.listing_price).toLocaleString("en-IN")}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{off.seller_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{off.seller_email}</div>
                  </td>
                  <td><strong>₹{Number(off.offered_price).toLocaleString("en-IN")}</strong></td>
                  <td><StatusBadge tone="green">Accepted</StatusBadge></td>
                  <td>
                    <div className="table-actions">
                      <Button onClick={() => openPaymentModal(off)} icon={<ClipboardCheck size={15} />}>
                        Proceed to Payment
                      </Button>
                      <button className="table-delete" onClick={() => void handleOfferAction(off.offer_id, "cancelled")}>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No accepted offers awaiting payment.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>My Offers / Negotiating</h2>
            <p>Offers you have sent to campus sellers</p>
          </div>
          <strong className="panel-count">{myNegotiatingOffers.length}</strong>
        </div>
        {myNegotiatingOffers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Listed Price</th>
                <th>Your Offer</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myNegotiatingOffers.map((off) => (
                <tr key={off.offer_id}>
                  <td>
                    <div className="table-product">
                      {off.listing_image && <img src={off.listing_image} alt="" />}
                      <Link to={`/product/${off.listing_id}`}><strong>{off.listing_title}</strong></Link>
                    </div>
                  </td>
                  <td>
                    <strong>{off.seller_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{off.seller_email}</div>
                  </td>
                  <td>₹{Number(off.listing_price).toLocaleString("en-IN")}</td>
                  <td><strong>₹{Number(off.offered_price).toLocaleString("en-IN")}</strong></td>
                  <td><StatusBadge tone={offerTone(off.status)}>{formatOfferStatus(off.status)}</StatusBadge></td>
                  <td>
                    {off.status === "pending" && (
                      <button className="table-delete" onClick={() => void handleOfferAction(off.offer_id, "cancelled")}>
                        Cancel Offer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No pending, rejected, or cancelled offers.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Received Offers</h2>
            <p>Offers submitted by buyers on your listings</p>
          </div>
          <strong className="panel-count">{sellerPendingOrPastOffers.length}</strong>
        </div>
        {sellerPendingOrPastOffers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Listed Price</th>
                <th>Buyer</th>
                <th>Offered Price</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellerPendingOrPastOffers.map((off) => (
                <tr key={off.offer_id}>
                  <td>
                    <div className="table-product">
                      {off.listing_image && <img src={off.listing_image} alt="" />}
                      <Link to={`/product/${off.listing_id}`}><strong>{off.listing_title}</strong></Link>
                    </div>
                  </td>
                  <td>₹{Number(off.listing_price).toLocaleString("en-IN")}</td>
                  <td>
                    <strong>{off.buyer_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{off.buyer_email}</div>
                  </td>
                  <td><strong>₹{Number(off.offered_price).toLocaleString("en-IN")}</strong></td>
                  <td style={{ fontSize: 12 }}>{new Date(off.created_at).toLocaleString("en-IN")}</td>
                  <td><StatusBadge tone={offerTone(off.status)}>{formatOfferStatus(off.status)}</StatusBadge></td>
                  <td>
                    {off.status === "pending" && (
                      <div className="table-actions">
                        <button className="table-view" onClick={() => void handleOfferAction(off.offer_id, "accepted")}>
                          Accept
                        </button>
                        <button className="table-delete" onClick={() => void handleOfferAction(off.offer_id, "rejected")}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No received offers yet.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Accepted Offers / Awaiting Payment</h2>
            <p>Listings reserved for buyers who are completing mock payment</p>
          </div>
          <strong className="panel-count">{sellerAcceptedAwaitingPayment.length}</strong>
        </div>
        {sellerAcceptedAwaitingPayment.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Buyer Contact</th>
                <th>Accepted Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sellerAcceptedAwaitingPayment.map((off) => (
                <tr key={off.offer_id}>
                  <td>
                    <div className="table-product">
                      {off.listing_image && <img src={off.listing_image} alt="" />}
                      <strong>{off.listing_title}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{off.buyer_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{off.buyer_email}</div>
                  </td>
                  <td><strong>₹{Number(off.offered_price).toLocaleString("en-IN")}</strong></td>
                  <td><StatusBadge tone="amber">Accepted · Awaiting Payment</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No accepted offers currently awaiting buyer payment.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Purchases</h2>
            <p>Items you have purchased on PeerMart</p>
          </div>
          <strong className="panel-count">{purchases.length}</strong>
        </div>
        {purchases.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Paid Amount</th>
                <th>Receipt #</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((sale) => (
                <tr key={sale.sale_id}>
                  <td>
                    <div className="table-product">
                      {sale.image && <img src={sale.image} alt="" />}
                      <strong>{sale.title}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{sale.seller_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{sale.seller_email}</div>
                  </td>
                  <td><strong>₹{Number(sale.final_price).toLocaleString("en-IN")}</strong></td>
                  <td>{sale.receipt_number}</td>
                  <td>
                    <div className="table-actions">
                      <button className="table-view" onClick={() => void downloadSaleReceiptPdf(sale.sale_id, sale.receipt_number)}>
                        Download Receipt
                      </button>
                      <Link to={`/receipt?sale_id=${sale.sale_id}`} className="table-view">
                        View Receipt
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No completed purchases yet.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Completed Sales</h2>
            <p>Listings you have sold to campus buyers</p>
          </div>
          <strong className="panel-count">{soldItems.length}</strong>
        </div>
        {soldItems.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Buyer</th>
                <th>Final Price</th>
                <th>Receipt #</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {soldItems.map((sale) => (
                <tr key={sale.sale_id}>
                  <td>
                    <div className="table-product">
                      {sale.image && <img src={sale.image} alt="" />}
                      <strong>{sale.title}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{sale.buyer_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{sale.buyer_email}</div>
                  </td>
                  <td><strong>₹{Number(sale.final_price).toLocaleString("en-IN")}</strong></td>
                  <td>{sale.receipt_number}</td>
                  <td>
                    <div className="table-actions">
                      <button className="table-view" onClick={() => void downloadSaleReceiptPdf(sale.sale_id, sale.receipt_number)}>
                        Download Receipt
                      </button>
                      <Link to={`/receipt?sale_id=${sale.sale_id}`} className="table-view">
                        View Receipt
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No completed sales yet.</div>
        )}
      </section>

      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <h2>Payment Receipts</h2>
            <p>Official demo payment receipts for your completed transactions</p>
          </div>
          <strong className="panel-count">{allReceipts.length}</strong>
        </div>
        {allReceipts.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Payment Ref</th>
                <th>Role</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allReceipts.map((rcpt) => (
                <tr key={`${rcpt.roleLabel}-${rcpt.sale_id}`}>
                  <td><strong>{rcpt.receipt_number}</strong></td>
                  <td style={{ fontSize: 12 }}>{rcpt.payment_reference}</td>
                  <td><StatusBadge tone="blue">{rcpt.roleLabel}</StatusBadge></td>
                  <td>{rcpt.title}</td>
                  <td><strong>₹{Number(rcpt.final_price).toLocaleString("en-IN")}</strong></td>
                  <td>
                    <button className="table-view" onClick={() => void downloadSaleReceiptPdf(rcpt.sale_id, rcpt.receipt_number)}>
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">No payment receipts generated yet.</div>
        )}
      </section>

      <div className="support-card" style={{ marginTop: 24 }}>
        <CircleHelp />
        <div>
          <strong>Need help?</strong>
          <p>Contact your campus administrator at <b>admin@iitdh.ac.in</b> or via <Link to="/contact-admin"><strong>Contact Admin</strong></Link>.</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Button variant="danger" icon={<LogOut size={17} />} onClick={() => setLoggingOut(true)}>Log out</Button>
        {currentUser?.role !== "admin" && (
          <Button
            variant="outline"
            onClick={async () => {
              if (!window.confirm("Deactivate your PeerMart account?")) return;
              try {
                await apiDeactivateAccount();
                setLoggedIn(false);
                navigate("/login", { replace: true });
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Could not deactivate account");
              }
            }}
          >
            Deactivate account
          </Button>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop">
          <form className="modal edit-profile-modal" onSubmit={saveProfile}>
            <button type="button" className="modal-close" onClick={() => setEditing(false)}><X /></button>
            <span className="modal-icon"><User /></span>
            <h2>Edit profile</h2>
            <p>Update your personal information. Your verified college email cannot be changed here.</p>
            <div className="form-row">
              <label className="field"><span>First name</span><input required value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} /></label>
              <label className="field"><span>Last name</span><input required value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} /></label>
            </div>
            <label className="field"><span>College email</span><input value={currentUser?.email ?? ""} disabled /></label>
            <label className="field"><span>Phone number</span><input required type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </div>
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={refreshMarketplace}
        />
      )}

      {loggingOut && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setLoggingOut(false)}><X /></button>
            <span className="modal-icon logout-icon"><LogOut /></span>
            <h2>Log out of PeerMart?</h2>
            <p>You’ll need to sign in again to access your profile, orders, favourites, cart, and listings.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setLoggingOut(false)}>Stay signed in</Button>
              <Button variant="danger" onClick={async () => {
                try {
                  await apiLogout();
                  setLoggedIn(false);
                  navigate("/login", { replace: true });
                } catch (error) {
                  window.alert(
                    error instanceof Error
                      ? error.message
                      : "Logout failed. Please try again.",
                  );
                }
              }}>Log out</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function OrdersPage() {
  const { sentOffers, purchases, refreshMarketplace, openPaymentModal } = useCart();
  const [contactOffer, setContactOffer] = useState<OfferDetail | null>(null);

  const activeSentOffers = sentOffers.filter((o) => o.status !== "paid");

  const handleCancelOffer = async (offerId: number) => {
    try {
      await updateOfferStatusApi(offerId, "cancelled");
      await refreshMarketplace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not cancel offer");
    }
  };

  return (
    <DashboardShell title="My orders" copy="Track your sent offers, accepted deals, and completed campus purchases.">
      <SectionHeading title="My Offers & Negotiations" copy="Every offer you have submitted to campus sellers." />
      {activeSentOffers.length > 0 ? (
        activeSentOffers.map((off) => (
          <div className="order-row" key={off.offer_id}>
            <img src={off.listing_image || photos.books} alt={off.listing_title} />
            <div className="order-info">
              <div>
                <h3>{off.listing_title}</h3>
                <p>
                  Seller: {off.seller_name} ({off.seller_email}) · Listed: ₹{Number(off.listing_price).toLocaleString("en-IN")} ·{" "}
                  <strong>Offered: ₹{Number(off.offered_price).toLocaleString("en-IN")}</strong>
                </p>
              </div>
              <StatusBadge tone={offerTone(off.status)}>{formatOfferStatus(off.status)}</StatusBadge>
            </div>
            <div className="order-actions">
              {off.status === "accepted" && (
                <Button onClick={() => openPaymentModal(off)} icon={<ClipboardCheck size={16} />}>
                  Proceed to Payment
                </Button>
              )}
              <Button variant="outline" icon={<Mail size={16} />} onClick={() => setContactOffer(off)}>
                Contact seller
              </Button>
              {(off.status === "pending" || off.status === "accepted") && (
                <Button variant="danger" onClick={() => void handleCancelOffer(off.offer_id)}>
                  Cancel Offer
                </Button>
              )}
              <Link to={`/product/${off.listing_id}`} className="text-link">View item</Link>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state soft">
          <span className="empty-icon"><ShoppingBag /></span>
          <h2>No active negotiations</h2>
          <p>Make an offer on any available item and it will appear here.</p>
          <Link to="/browse" className="btn btn-primary">Browse available items</Link>
        </div>
      )}

      <SectionHeading title="Completed purchases" copy="Finalized deals paid through the PeerMart demo payment gateway." />
      {purchases.length > 0 ? (
        purchases.map((sale) => (
          <div className="order-row" key={sale.sale_id}>
            <img src={sale.image || photos.books} alt={sale.title} />
            <div className="order-info">
              <div>
                <h3>{sale.title}</h3>
                <p>
                  Seller: {sale.seller_name} ({sale.seller_email}) · Paid: ₹{Number(sale.final_price).toLocaleString("en-IN")} · Receipt: {sale.receipt_number}
                </p>
              </div>
              <StatusBadge tone="green">Paid &amp; Completed</StatusBadge>
            </div>
            <div className="order-actions">
              <Button
                variant="outline"
                icon={<Download size={16} />}
                onClick={() => void downloadSaleReceiptPdf(sale.sale_id, sale.receipt_number)}
              >
                Download Receipt
              </Button>
              <Link to={`/receipt?sale_id=${sale.sale_id}`} className="btn btn-outline">
                <FileText size={16} /> View receipt
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state soft">
          <span className="empty-icon"><PackageCheck /></span>
          <h2>No completed purchases yet</h2>
          <p>Once a seller accepts your offer and you complete mock payment, your purchase and receipt appear here.</p>
        </div>
      )}

      {contactOffer && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setContactOffer(null)}><X /></button>
            <span className="modal-icon"><Mail /></span>
            <h2>Contact seller</h2>
            <p>Use the seller’s verified IIT Dharwad email address regarding <strong>{contactOffer.listing_title}</strong>.</p>
            <div className="contact-box">
              <Mail size={19} />
              <div>
                <small>{contactOffer.seller_name} · verified college email</small>
                <strong>{contactOffer.seller_email}</strong>
              </div>
            </div>
            <div className="modal-actions"><Button onClick={() => setContactOffer(null)}>Done</Button></div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function SellsPage() {
  const products = useProducts();
  const { currentUser, receivedOffers, soldItems, refreshMarketplace } = useCart();
  const [tab, setTab] = useState<"available" | "negotiating" | "sold">("available");
  const [editingListing, setEditingListing] = useState<Product | null>(null);
  const [removingListing, setRemovingListing] = useState<Product | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const myListings = products.filter(
    (item) => currentUser && item.sellerId === currentUser.user_id,
  );
  const availableListings = myListings.filter((item) => item.status !== "Sold");
  const activeReceivedOffers = receivedOffers.filter((off) =>
    ["pending", "accepted"].includes(off.status),
  );

  const handleOfferDecision = async (
    offerId: number,
    status: "accepted" | "rejected",
  ) => {
    try {
      await updateOfferStatusApi(offerId, status);
      setSavedBanner(`Offer ${status} successfully.`);
      await refreshMarketplace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update offer");
    }
  };

  const confirmDeleteListing = async () => {
    if (!removingListing) return;
    try {
      await deleteListingApi(removingListing.id);
      setSavedBanner(`Removed "${removingListing.title}".`);
      setRemovingListing(null);
      await refreshMarketplace();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to remove listing");
    }
  };

  return (
    <DashboardShell title="My Sell" copy="Manage your listings, respond to buyer offers, and download sales receipts.">
      <div className="seller-page-head">
        <div><strong>Your listings &amp; offers</strong><span>Create, edit, and track every item you’re selling.</span></div>
        <Link to="/sell" className="btn btn-primary"><Tag size={16} /> Add New Listing</Link>
      </div>
      <div className="tab-bar">
        <button className={tab === "available" ? "active" : ""} onClick={() => setTab("available")}>
          My Listings <span>{availableListings.length}</span>
        </button>
        <button className={tab === "negotiating" ? "active" : ""} onClick={() => setTab("negotiating")}>
          Received Offers <span>{activeReceivedOffers.length}</span>
        </button>
        <button className={tab === "sold" ? "active" : ""} onClick={() => setTab("sold")}>
          Completed Sales <span>{soldItems.length}</span>
        </button>
      </div>

      {savedBanner && (
        <div className="save-confirmation" role="status">
          <Check size={17} /> {savedBanner}
        </div>
      )}

      {tab === "available" && (
        availableListings.length > 0 ? (
          availableListings.map((listing) => (
            <div className="seller-listing-card" key={listing.id} style={{ marginBottom: 16 }}>
              <img src={listing.image} alt={listing.title} />
              <div className="seller-listing-info">
                <div className="seller-listing-heading">
                  <div><h3>{listing.title}</h3></div>
                  <StatusBadge tone={listing.status === "Available" ? "green" : "amber"}>
                    {listing.status ?? "Available"}
                  </StatusBadge>
                </div>
                <p>{listing.price} · {listing.condition} · {listing.category}</p>
                <div className="seller-listing-actions">
                  <Button variant="outline" onClick={() => setEditingListing(listing)}>Edit listing</Button>
                  <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setRemovingListing(listing)}>
                    Remove listing
                  </Button>
                  <Link to={`/product/${listing.id}`} className="text-link">View details <ArrowRight size={15} /></Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state soft">
            <span className="empty-icon"><Store /></span>
            <h2>No active listings</h2>
            <p>Publish an item on campus to start receiving student offers.</p>
            <Link to="/sell" className="btn btn-primary">Add a new listing</Link>
          </div>
        )
      )}

      {tab === "negotiating" && (
        receivedOffers.length > 0 ? (
          receivedOffers.map((off) => (
            <div className="seller-listing-card" key={off.offer_id} style={{ marginBottom: 16 }}>
              <img src={off.listing_image || photos.cycle} alt={off.listing_title} />
              <div className="seller-listing-info">
                <div className="seller-listing-heading">
                  <div>
                    <h3>{off.listing_title}</h3>
                    <p style={{ margin: "4px 0" }}>
                      Buyer: <strong>{off.buyer_name}</strong> ({off.buyer_email}) ·{" "}
                      <small>{new Date(off.created_at).toLocaleString("en-IN")}</small>
                    </p>
                  </div>
                  <StatusBadge tone={offerTone(off.status)}>{formatOfferStatus(off.status)}</StatusBadge>
                </div>
                <p>
                  Listed price: ₹{Number(off.listing_price).toLocaleString("en-IN")} ·{" "}
                  <strong>Offered price: ₹{Number(off.offered_price).toLocaleString("en-IN")}</strong>
                </p>
                <div className="seller-listing-actions">
                  {off.status === "pending" && (
                    <>
                      <Button icon={<Check size={16} />} onClick={() => void handleOfferDecision(off.offer_id, "accepted")}>
                        Accept Offer
                      </Button>
                      <Button variant="danger" onClick={() => void handleOfferDecision(off.offer_id, "rejected")}>
                        Reject Offer
                      </Button>
                    </>
                  )}
                  {off.status === "accepted" && (
                    <span className="muted">Accepted — reserved for buyer and awaiting mock payment.</span>
                  )}
                  <Link to={`/product/${off.listing_id}`} className="text-link">View listing <ArrowRight size={15} /></Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state soft">
            <span className="empty-icon"><Mail /></span>
            <h2>No received offers yet</h2>
            <p>When buyers submit offers on your listings, they will appear here automatically.</p>
          </div>
        )
      )}

      {tab === "sold" && (
        soldItems.length > 0 ? (
          soldItems.map((sale) => (
            <div className="seller-listing-card" key={sale.sale_id} style={{ marginBottom: 16 }}>
              <img src={sale.image || photos.books} alt={sale.title} />
              <div className="seller-listing-info">
                <div className="seller-listing-heading">
                  <div><h3>{sale.title}</h3></div>
                  <StatusBadge tone="green">Sold</StatusBadge>
                </div>
                <p>
                  Sold to <strong>{sale.buyer_name}</strong> ({sale.buyer_email}) for{" "}
                  <strong>₹{Number(sale.final_price).toLocaleString("en-IN")}</strong> · Receipt: {sale.receipt_number}
                </p>
                <div className="seller-listing-actions">
                  <Button
                    variant="outline"
                    icon={<Download size={16} />}
                    onClick={() => void downloadSaleReceiptPdf(sale.sale_id, sale.receipt_number)}
                  >
                    Download Receipt
                  </Button>
                  <Link to={`/receipt?sale_id=${sale.sale_id}`} className="btn btn-outline">
                    <FileText size={16} /> View receipt
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state soft">
            <span className="empty-icon"><ClipboardCheck /></span>
            <h2>No completed sales yet</h2>
            <p>Completed sales will appear here after an accepted offer is paid by the buyer.</p>
          </div>
        )
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={async () => {
            setSavedBanner("Listing changes saved successfully.");
            await refreshMarketplace();
          }}
        />
      )}

      {removingListing && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setRemovingListing(null)}><X /></button>
            <span className="modal-icon logout-icon"><Trash2 /></span>
            <h2>Remove this listing?</h2>
            <p><strong>{removingListing.title}</strong> will be removed from your available listings and will no longer be visible to buyers.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setRemovingListing(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void confirmDeleteListing()}>Remove listing</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function FavouritesPage() {
  const products = useProducts();
  const { favouriteIds } = useCart();
  const favouriteProducts = favouriteIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  return (
    <DashboardShell title="Favourites" copy="All your saved campus finds in one place.">
      {favouriteProducts.length > 0 ? (
        <div className="product-grid compact">{favouriteProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div>
      ) : (
        <div className="empty-state soft">
          <span className="empty-icon"><Heart /></span>
          <h2>No favourites yet</h2>
          <p>Select the heart on any available product to keep it here for later.</p>
          <Link to="/browse" className="btn btn-primary">Browse available items</Link>
        </div>
      )}
    </DashboardShell>
  );
}

function CartPage() {
  const products = useProducts();
  const { cartIds, removeFromCart } = useCart();
  const cartItems = cartIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const subtotal = cartItems.reduce(
    (total, item) => total + (item.numericPrice ?? Number(item.price.replace(/[₹,]/g, ""))),
    0,
  );

  return (
    <DashboardShell title="My cart" copy="Items you’re considering. Each listing is one unique item.">
      <div className="cart-note"><CircleHelp /><span>Adding an item does not reserve it or guarantee availability. Submit an offer on the product page to negotiate with the seller.</span></div>
      {cartItems.length > 0 ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={item.image} alt={item.title} />
                <div className="cart-item-main">
                  <div className="cart-item-title">
                    <div><span>{item.category} · {item.condition}</span><h3>{item.title}</h3></div>
                    <StatusBadge>{item.status ?? "Available"}</StatusBadge>
                  </div>
                  <p>Seller: {item.sellerName || "Campus Seller"} · IIT DH verified</p>
                  <div className="cart-item-bottom">
                    <strong>{item.price}</strong>
                    <div>
                      <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => { void removeFromCart(item.id); }}>Remove</Button>
                      <Link to={`/product/${item.id}`} className="btn btn-primary"><Mail size={16} /> Make Offer</Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <h2>Cart summary</h2>
            <div><span>{cartItems.length} available {cartItems.length === 1 ? "item" : "items"}</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div>
          </aside>
        </div>
      ) : (
        <div className="empty-state soft">
          <span className="empty-icon"><ShoppingCart /></span>
          <h2>Your cart is empty</h2>
          <p>Browse available campus listings and save an item you’d like to discuss with its seller.</p>
          <Link to="/browse" className="btn btn-primary">Browse available items</Link>
        </div>
      )}
    </DashboardShell>
  );
}

function ReceiptPage() {
  const location = useLocation();
  const { purchases, soldItems } = useCart();
  const saleIdParam = new URLSearchParams(location.search).get("sale_id");
  const allSales = [...purchases, ...soldItems];
  const selectedSale = saleIdParam
    ? allSales.find((s) => s.sale_id === Number(saleIdParam))
    : allSales[0];

  if (!selectedSale) {
    return (
      <section className="receipt-page container">
        <div className="receipt-actions">
          <Link to="/orders" className="back-link"><ArrowLeft /> Back to orders</Link>
        </div>
        <div className="empty-state soft">
          <span className="empty-icon"><FileText /></span>
          <h2>No receipt selected</h2>
          <p>Complete a purchase via the Demo Payment Gateway to generate an official PeerMart receipt.</p>
          <Link to="/profile" className="btn btn-primary">Back to Profile</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="receipt-page container">
      <div className="receipt-actions">
        <Link to="/profile" className="back-link"><ArrowLeft /> Back to profile</Link>
        <div>
          <Button variant="outline" icon={<Printer size={16} />} onClick={() => window.print()}>Print</Button>
          <Button
            icon={<Download size={16} />}
            onClick={() => void downloadSaleReceiptPdf(selectedSale.sale_id, selectedSale.receipt_number)}
          >
            Download PDF Receipt
          </Button>
        </div>
      </div>
      <article className="receipt">
        <div className="receipt-head">
          <div>
            <strong>Indian Institute of Technology Dharwad</strong>
            <div className="muted" style={{ fontSize: 13 }}>PeerMart — Campus Buy, Sell &amp; Reuse Marketplace</div>
          </div>
          <StatusBadge>SUCCESS (SIMULATED)</StatusBadge>
        </div>
        <div className="receipt-title">
          <span>DEMO PAYMENT RECEIPT</span>
          <h1>Receipt {selectedSale.receipt_number}</h1>
          <p>
            Sale ID #{selectedSale.sale_id} · Ref {selectedSale.payment_reference} ·{" "}
            {new Date(selectedSale.sold_at).toLocaleString("en-IN")} · Method: {selectedSale.payment_method}
          </p>
        </div>
        <div className="receipt-product">
          <img src={selectedSale.image || photos.books} alt={selectedSale.title} />
          <div>
            <span>Product (Listing #{selectedSale.listing_id})</span>
            <h2>{selectedSale.title}</h2>
            <p>
              {selectedSale.item_condition} · {selectedSale.category} · Listed: ₹{Number(selectedSale.listed_price).toLocaleString("en-IN")} · Accepted Offer: ₹{Number(selectedSale.offered_price).toLocaleString("en-IN")}
            </p>
          </div>
          <strong>₹{Number(selectedSale.final_price).toLocaleString("en-IN")}</strong>
        </div>
        <div className="receipt-parties">
          <div>
            <span>SELLER</span>
            <strong>{selectedSale.seller_name}</strong>
            <p>{selectedSale.seller_email}<br />IIT Dharwad</p>
          </div>
          <ArrowRight />
          <div>
            <span>BUYER</span>
            <strong>{selectedSale.buyer_name}</strong>
            <p>{selectedSale.buyer_email}<br />IIT Dharwad</p>
          </div>
        </div>
        <div className="receipt-total">
          <span>Final Paid Amount (INR)</span>
          <strong>₹{Number(selectedSale.final_price).toLocaleString("en-IN")}</strong>
        </div>
        <div className="receipt-disclaimer">
          <ShieldCheck />
          <p>This receipt was generated by PeerMart, a student academic project at IIT Dharwad. This is a simulated transaction. No real money was transferred.</p>
        </div>
      </article>
    </section>
  );
}

function ProtectedAdminPage() {
  const [status, setStatus] = useState<
    "checking" | "authorized" | "denied"
  >("checking");

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (active) {
          setStatus(user.role === "admin" ? "authorized" : "denied");
        }
      })
      .catch(() => {
        if (active) setStatus("denied");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return <p className="container">Verifying administrator access...</p>;
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return <AdminPage />;
}

function AdminProductTable({
  title,
  copy,
  items,
  status,
  tone = "blue",
  onDelete,
}: {
  title: string;
  copy: string;
  items: Product[];
  status: string;
  tone?: "green" | "blue" | "amber" | "slate";
  onDelete?: (product: Product) => void;
}) {
  return (
    <section className="admin-panel">
      <div className="panel-head"><div><h2>{title}</h2><p>{copy}</p></div><strong className="panel-count">{items.length}</strong></div>
      {items.length > 0 ? (
        <table>
          <thead><tr><th>Listing</th><th>Category</th><th>Price</th><th>Status</th>{onDelete && <th>Action</th>}</tr></thead>
          <tbody>{items.map((product) => <tr key={`${title}-${product.id}`}><td><div className="table-product"><img src={product.image} alt="" /><strong>{product.title}</strong></div></td><td>{product.category}</td><td>{product.price}</td><td><StatusBadge tone={tone}>{status}</StatusBadge></td>{onDelete && <td><button className="table-delete" onClick={() => onDelete(product)}><Trash2 size={14} /> Delete product</button></td>}</tr>)}</tbody>
        </table>
      ) : <div className="admin-empty">No items in this section.</div>}
    </section>
  );
}

function AdminPage() {
  const products = useProducts();
  const navigate = useNavigate();
  const { setLoggedIn, currentUser } = useCart();
  const [view, setView] = useState<"overview" | "users" | "listings" | "categories" | "messages">("overview");
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  const [adminUsers, setAdminUsers] = useState<
    { id: number; name: string; email: string; joined: string; status: string }[]
  >([]);

  const [adminListings, setAdminListings] = useState(products);

  useEffect(() => {
    setAdminListings(products);
  }, [products]);

  const [adminCategories, setAdminCategories] = useState<string[]>([]);
  const [adminDataError, setAdminDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      try {
        const [users, categories, messagesRes] = await Promise.all([
          getAdminUsers(),
          getAdminCategories(),
          getAdminContactMessages(),
        ]);

        if (cancelled) return;

        setAdminUsers(
          users.map((user) => ({
            id: user.user_id,
            name: `${user.f_name} ${user.l_name}`,
            email: user.email,
            joined: new Date(user.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            status: user.account_status,
          }))
        );

        setAdminCategories(
          categories.map((category) => category.category_name)
        );
        setContactMessages(messagesRes.items);

        setAdminDataError(null);
      } catch (error) {
        if (!cancelled) {
          setAdminDataError(
            error instanceof Error ? error.message : "Unable to load admin data"
          );
        }
      }
    }

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "listing" | "category"; id: number | string; label: string } | null>(null);
  const selectedUser = adminUsers.find((user) => user.id === selectedUserId);
  const categoryListings = selectedCategory ? adminListings.filter((listing) => listing.category === selectedCategory) : [];
  const [userActivity, setUserActivity] = useState<AdminUserActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUserId === null) {
      setUserActivity(null);
      setActivityError(null);
      return;
    }

    let cancelled = false;
    setUserActivity(null);
    setActivityLoading(true);
    setActivityError(null);

    getAdminUserActivity(selectedUserId)
      .then((data) => {
        if (!cancelled) setUserActivity(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setActivityError(
            error instanceof Error ? error.message : "Unable to load activity"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const logoutAdmin = async () => {
    try {
      await apiLogout();
      setLoggedIn(false);
      navigate("/login", { replace: true });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Admin logout failed. Please try again."
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "user") {
        const id = Number(deleteTarget.id);
        await updateAdminUserStatus(id, "inactive");
        setAdminUsers(current => current.map(user =>
          user.id === id ? { ...user, status: "inactive" } : user
        ));
      } else if (deleteTarget.type === "listing") {
        const id = Number(deleteTarget.id);
        await updateAdminListingStatus(id, "removed");
        setAdminListings(current => current.filter(item => item.id !== id));
      } else {
        window.alert("Category deletion is not supported yet.");
        return;
      }
      setDeleteTarget(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Admin action failed");
    }
  };

  const changeView = (nextView: "overview" | "users" | "listings" | "categories" | "messages") => {
    setView(nextView);
    setSelectedUserId(null);
    setSelectedCategory(null);
  };

  const headings = {
    overview: ["Marketplace overview", "Monitor IIT DH marketplace activity and manage core records."],
    users: ["User management", "Review and manage registered IIT DH marketplace accounts."],
    listings: ["Listing management", "Review available products and remove inappropriate listings."],
    categories: ["Category management", "Manage the categories students use when listing products."],
    messages: ["Contact messages", "Review student support requests and listing reports."],
  };
  const activeHeading = selectedUser
    ? [selectedUser.name, "Review this user’s listings, negotiations, purchases, and sold items."]
    : selectedCategory
      ? [selectedCategory, `Review every marketplace listing filed under ${selectedCategory}.`]
      : headings[view];

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Logo to="/admin" />
        <nav>
          <button className={view === "overview" ? "active" : ""} onClick={() => changeView("overview")}><LayoutDashboard /> Overview</button>
          <button className={view === "users" ? "active" : ""} onClick={() => changeView("users")}><Users /> User management</button>
          <button className={view === "listings" ? "active" : ""} onClick={() => changeView("listings")}><ShoppingBag /> Listings</button>
          <button className={view === "categories" ? "active" : ""} onClick={() => changeView("categories")}><Tag /> Categories</button>
          <button className={view === "messages" ? "active" : ""} onClick={() => changeView("messages")}><Mail /> Contact messages</button>
        </nav>
        <div className="admin-user"><div>{getUserInitials(currentUser)}</div><span><strong>{currentUser ? `${currentUser.f_name} ${currentUser.l_name}`.trim() : "Campus Admin"}</strong><small>{currentUser?.email ?? "admin@iitdh.ac.in"}</small></span></div>
        <button className="admin-logout" onClick={logoutAdmin}><LogOut size={16} /> Log out</button>
      </aside>
      <main className="admin-main">
        {adminDataError && (
          <div role="alert" className="notice">
            Failed to load admin data: {adminDataError}
          </div>
        )}
        <div className="admin-head"><div><span>ADMIN CONSOLE</span><h1>{activeHeading[0]}</h1><p>{activeHeading[1]}</p></div></div>

        {view === "overview" && (
          <>
            <div className="metric-grid admin-metrics-three">
              {[["Registered users", String(adminUsers.length), Users, "Student accounts"], ["Total listings", String(adminListings.length), ShoppingBag, "Active records"], ["Categories", String(adminCategories.length), Tag, "Marketplace groups"]].map(([label, value, Icon, trend]) => { const I = Icon as typeof Users; return <button className="metric" key={label as string} onClick={() => changeView(label === "Registered users" ? "users" : label === "Categories" ? "categories" : "listings")}><span><I /></span><p>{label as string}</p><strong>{value as string}</strong><small>{trend as string}</small></button>; })}
            </div>
            <section className="admin-panel">
              <div className="panel-head"><div><h2>Recent listings</h2><p>Newest products in the marketplace</p></div><button onClick={() => changeView("listings")}>Manage listings</button></div>
              <table><thead><tr><th>Listing</th><th>Category</th><th>Status</th><th>Price</th></tr></thead><tbody>{adminListings.slice(0, 6).map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.image} alt="" /><strong>{product.title}</strong></div></td><td>{product.category}</td><td><StatusBadge tone={product.status === "Available" ? "green" : product.status === "Reserved" ? "amber" : "slate"}>{product.status ?? "Unknown"}</StatusBadge></td><td>{product.price}</td></tr>)}</tbody></table>
            </section>
          </>
        )}

        {view === "users" && !selectedUser && (
          <section className="admin-panel">
            <div className="panel-head"><div><h2>Registered users</h2><p>{adminUsers.length} active student accounts</p></div></div>
            {adminUsers.length > 0 ? <table><thead><tr><th>User</th><th>College email</th><th>Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>{adminUsers.map((user) => <tr key={user.id}><td><button className="table-user-link" onClick={() => setSelectedUserId(user.id)}>{user.name}</button></td><td>{user.email}</td><td>{user.joined}</td><td><StatusBadge>{user.status}</StatusBadge></td><td><div className="table-actions"><button className="table-view" onClick={() => setSelectedUserId(user.id)}>View activity</button>{user.status === "active" ? (
  <button className="table-delete" onClick={() => setDeleteTarget({ type: "user", id: user.id, label: user.name })}>
    <Trash2 size={14} /> Deactivate
  </button>
) : (
  <button className="table-view" onClick={async () => {
    try {
      await updateAdminUserStatus(user.id, "active");
      setAdminUsers(current => current.map(item =>
        item.id === user.id ? { ...item, status: "active" } : item
      ));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Reactivation failed");
    }
  }}>Reactivate</button>
)}</div></td></tr>)}</tbody></table> : <div className="admin-empty">No user accounts remain.</div>}
          </section>
        )}

        {view === "users" && selectedUser && (
          <div className="admin-detail-stack">
            <button className="panel-back" onClick={() => setSelectedUserId(null)}><ArrowLeft size={15} /> Back to all users</button>
            <section className="admin-panel user-summary-panel">
              <div className="panel-head"><div><h2>{selectedUser.name}</h2><p>{selectedUser.email} · Joined {selectedUser.joined}</p></div><StatusBadge>{selectedUser.status}</StatusBadge></div>
            </section>
            {activityLoading && <div className="admin-panel">Loading real user activity...</div>}
            {activityError && <div className="notice" role="alert">{activityError}</div>}
            {userActivity && (
              <>
                <section className="admin-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Account details</h2>
                      <p>Verified database information</p>
                    </div>
                  </div>
                  <p>Phone: {userActivity.user.phone_no || "Not provided"}</p>
                  <p>Role: {userActivity.user.role}</p>
                  <p>Status: {userActivity.user.account_status}</p>
                </section>
                {([
                  ["All listings", userActivity.listings.map(item => ({
                    id: item.listing_id,
                    title: item.title,
                    amount: item.price,
                    status: item.status,
                  }))],
                  ["Negotiations as seller", userActivity.seller_negotiations.map(item => ({
                    id: item.offer_id,
                    title: item.title,
                    amount: item.offered_price,
                    status: item.status,
                  }))],
                  ["Negotiations as buyer", userActivity.buyer_negotiations.map(item => ({
                    id: item.offer_id,
                    title: item.title,
                    amount: item.offered_price,
                    status: item.status,
                  }))],
                  ["Completed purchases", userActivity.completed_purchases.map(item => ({
                    id: item.sale_id,
                    title: item.title,
                    amount: item.final_price,
                    status: "Completed",
                  }))],
                  ["Sold items", userActivity.sold_items.map(item => ({
                    id: item.sale_id,
                    title: item.title,
                    amount: item.final_price,
                    status: "Sold",
                  }))],
                ] as const).map(([title, records]) => (
                  <section className="admin-panel" key={title}>
                    <div className="panel-head">
                      <div><h2>{title}</h2><p>Actual records from MySQL</p></div>
                      <strong className="panel-count">{records.length}</strong>
                    </div>
                    {records.length === 0 ? (
                      <div className="admin-empty">No records found.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr><th>Item</th><th>Amount</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {records.map(item => (
                            <tr key={item.id}>
                              <td>{item.title}</td>
                              <td>₹{item.amount.toLocaleString("en-IN")}</td>
                              <td><StatusBadge>{item.status}</StatusBadge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                ))}
              </>
            )}
          </div>
        )}

        {view === "listings" && (
          <section className="admin-panel">
            <div className="panel-head"><div><h2>Product listings</h2><p>{adminListings.length} available listings</p></div></div>
            {adminListings.length > 0 ? <table><thead><tr><th>Listing</th><th>Category</th><th>Condition</th><th>Price</th><th>Action</th></tr></thead><tbody>{adminListings.map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.image} alt="" /><strong>{product.title}</strong></div></td><td>{product.category}</td><td>{product.condition}</td><td>{product.price}</td><td><button className="table-delete" onClick={() => setDeleteTarget({ type: "listing", id: product.id, label: product.title })}><Trash2 size={14} /> Delete product</button></td></tr>)}</tbody></table> : <div className="admin-empty">No product listings remain.</div>}
          </section>
        )}

        {view === "categories" && !selectedCategory && (
          <section className="admin-panel category-admin-panel">
            <div className="panel-head"><div><h2>Marketplace categories</h2><p>{adminCategories.length} active categories</p></div></div>
            <div className="admin-category-grid">{adminCategories.map((category) => <div className="admin-category-card" key={category}><button className="admin-category-open" onClick={() => setSelectedCategory(category)}><span><Tag size={18} /></span><div><strong>{category}</strong><p>{adminListings.filter((listing) => listing.category === category).length} listings</p></div></button></div>)}</div>
            {adminCategories.length === 0 && <div className="admin-empty">No marketplace categories remain.</div>}
          </section>
        )}

        {view === "categories" && selectedCategory && (
          <div className="admin-detail-stack">
            <button className="panel-back" onClick={() => setSelectedCategory(null)}><ArrowLeft size={15} /> Back to all categories</button>
            <AdminProductTable title={`${selectedCategory} listings`} copy={`All products currently assigned to ${selectedCategory}.`} items={categoryListings} status="Available" tone="green" onDelete={(product) => setDeleteTarget({ type: "listing", id: product.id, label: product.title })} />
          </div>
        )}

        {view === "messages" && (
          <section className="admin-panel">
            <div className="panel-head">
              <div>
                <h2>Student inquiries &amp; reports</h2>
                <p>{contactMessages.length} submitted {contactMessages.length === 1 ? "message" : "messages"}</p>
              </div>
            </div>
            {contactMessages.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Subject &amp; Message</th>
                    <th>Listing</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contactMessages.map((msg) => (
                    <tr key={msg.message_id}>
                      <td>
                        <strong>{msg.sender_name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>{msg.sender_email}</div>
                      </td>
                      <td>
                        <strong>{msg.subject}</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 13 }}>{msg.message}</p>
                      </td>
                      <td>{msg.listing_title ?? "—"}</td>
                      <td>
                        <StatusBadge tone={msg.status === "resolved" ? "green" : msg.status === "reviewed" ? "blue" : "amber"}>
                          {msg.status}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="table-actions">
                          {msg.status !== "reviewed" && (
                            <button
                              className="table-view"
                              onClick={async () => {
                                try {
                                  const updated = await updateContactMessageStatus(msg.message_id, "reviewed");
                                  setContactMessages((prev) => prev.map((m) => (m.message_id === msg.message_id ? updated : m)));
                                } catch (err) {
                                  window.alert(err instanceof Error ? err.message : "Failed to update status");
                                }
                              }}
                            >
                              Mark reviewed
                            </button>
                          )}
                          {msg.status !== "resolved" && (
                            <button
                              className="table-view"
                              onClick={async () => {
                                try {
                                  const updated = await updateContactMessageStatus(msg.message_id, "resolved");
                                  setContactMessages((prev) => prev.map((m) => (m.message_id === msg.message_id ? updated : m)));
                                } catch (err) {
                                  window.alert(err instanceof Error ? err.message : "Failed to update status");
                                }
                              }}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="admin-empty">No contact messages submitted yet.</div>
            )}
          </section>
        )}
      </main>

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setDeleteTarget(null)}><X /></button>
            <span className="modal-icon logout-icon"><Trash2 /></span>
            <h2>{deleteTarget.type === "user" ? "Deactivate account?" : deleteTarget.type === "listing" ? "Remove listing?" : "Delete category?"}</h2>
            <p><strong>{deleteTarget.label}</strong> will be updated in MySQL. The record will be preserved.</p>
            {deleteTarget.type === "category" && <div className="notice"><CircleHelp size={18} /><span>Deleting a category does not automatically delete its existing product listings.</span></div>}
            <div className="modal-actions"><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Confirm action</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactAdminPage() {
  const products = useProducts();
  const location = useLocation();
  const initialListingId = new URLSearchParams(location.search).get("listing_id") ?? "";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [listingId, setListingId] = useState(initialListingId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [myMessages, setMyMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    getMyContactMessages()
      .then((res) => setMyMessages(res.items))
      .catch(() => {});
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const created = await submitContactMessage({
        subject,
        message,
        listing_id: listingId ? Number(listingId) : null,
      });
      setMyMessages((prev) => [created, ...prev]);
      setSubject("");
      setMessage("");
      setListingId("");
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Support & moderation"
        title="Contact Campus Admin"
        copy="Report a listing issue, ask a marketplace question, or reach the IIT DH administrator."
      />
      <section className="container content-section" style={{ maxWidth: 760 }}>
        <form className="admin-panel" onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: 16 }}>
          {submitSuccess && (
            <div className="notice" role="status">
              <Check size={18} />
              <span>Your message has been sent to the campus administrator.</span>
            </div>
          )}
          {submitError && (
            <div className="notice" role="alert">
              <CircleHelp size={18} />
              <span>{submitError}</span>
            </div>
          )}
          <label className="field">
            <span>Subject</span>
            <input
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. Question about listing verification"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Related listing (optional)</span>
            <div className="select-wrap">
              <select value={listingId} onChange={(e) => setListingId(e.target.value)}>
                <option value="">None — general inquiry</option>
                {products.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    #{item.id} — {item.title} ({item.price})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </label>
          <label className="field">
            <span>Message</span>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              placeholder="Describe your question or issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <div>
            <Button type="submit" disabled={submitting} icon={<Mail size={17} />}>
              {submitting ? "Sending..." : "Send to Admin"}
            </Button>
          </div>
        </form>

        {myMessages.length > 0 && (
          <section className="admin-panel" style={{ marginTop: 28 }}>
            <div className="panel-head">
              <div>
                <h2>Your recent messages</h2>
                <p>{myMessages.length} submitted</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Listing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myMessages.map((msg) => (
                  <tr key={msg.message_id}>
                    <td>
                      <strong>{msg.subject}</strong>
                      <div className="muted" style={{ fontSize: 13 }}>{msg.message}</div>
                    </td>
                    <td>{msg.listing_title ?? "—"}</td>
                    <td>
                      <StatusBadge tone={msg.status === "resolved" ? "green" : msg.status === "reviewed" ? "blue" : "amber"}>
                        {msg.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </section>
    </>
  );
}

function TermsPage() {
  const sections = ["Eligibility & campus rules", "Accurate product descriptions", "Prohibited & fraudulent listings", "Buyer responsibilities", "Seller responsibilities", "Offline negotiation & handover", "Reservations & availability", "Recording completed sales", "Warnings & account restrictions", "Privacy & contact"];
  return <><PageHero eyebrow="Last updated · February 2026" title="Terms & Conditions" copy="Plain-language rules for using PeerMart responsibly and safely." ><Button variant="outline" icon={<Download size={16} />}>Download PDF</Button></PageHero><section className="container terms-layout"><aside><strong>On this page</strong>{sections.map((s, i) => <a href={`#term-${i}`} key={s}>{i + 1}. {s}</a>)}</aside><article className="terms-content"><div className="terms-intro"><ShieldCheck /><p>PeerMart is a campus marketplace that helps students discover listings and contact one another. PeerMart does not process payments or guarantee offline transactions.</p></div>{sections.map((s, i) => <section id={`term-${i}`} key={s}><span>0{i + 1}</span><div><h2>{s}</h2><p>Users must act honestly, follow applicable campus policies, and communicate respectfully. Details supplied in listings and negotiations should be accurate and complete.</p>{i === 5 && <p>Buyers and sellers agree on price, meeting location, payment, and handover directly. Choose a safe public campus location and inspect the item before completing the deal.</p>}{i === 9 && <p>Administrator contact: <strong>admin@iitdh.ac.in</strong>.</p>}</div></section>)}</article></section></>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "browse", Component: BrowsePage },
      { path: "ai-search", Component: AISearchPage },
      { path: "category/:slug", Component: CategoryPage },
      { path: "product/:id", Component: ProductPage },
      { path: "sell", element: <ProtectedRoute><SellPage /></ProtectedRoute> },
      { path: "cart", element: <ProtectedRoute><CartPage /></ProtectedRoute> },
      { path: "login", element: <AuthShell /> },
      { path: "register", element: <AuthShell register /> },
      { path: "profile", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      { path: "orders", element: <ProtectedRoute><OrdersPage /></ProtectedRoute> },
      { path: "sells", element: <ProtectedRoute><SellsPage /></ProtectedRoute> },
      { path: "favourites", element: <ProtectedRoute><FavouritesPage /></ProtectedRoute> },
      { path: "receipt", element: <ProtectedRoute><ReceiptPage /></ProtectedRoute> },
      { path: "admin/login", element: <Navigate to="/login" replace /> },
      { path: "admin", Component: ProtectedAdminPage },
      { path: "terms", Component: TermsPage },
      { path: "contact-admin", element: <ProtectedRoute><ContactAdminPage /></ProtectedRoute> },
      { path: "*", element: <PageHero title="Page not found" copy="This campus path doesn’t exist yet." ><Link className="btn btn-primary" to="/">Back home</Link></PageHero> },
    ],
  },
]);
