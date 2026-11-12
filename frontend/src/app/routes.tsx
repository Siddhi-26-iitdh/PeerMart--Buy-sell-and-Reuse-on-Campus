import { runAiSearch, type AISearchResponse } from "./ai-search-api";
import { getAdminUsers, getAdminCategories, getAdminUserActivity, updateAdminUserStatus, updateAdminListingStatus, type AdminUserActivity } from "./admin-api";
import { updateProfile as apiUpdateProfile, getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from "./auth-api";
import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import { fetchProducts } from "./products-api";
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

const objectGalleries: Record<string, string[]> = {
  Books: [
    photos.books,
    "https://images.unsplash.com/photo-1516889454133-d3cd87326a6b?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1613035617861-c7b29e5cf65c?auto=format&fit=crop&w=900&q=82",
  ],
  Cycles: [
    photos.cycle,
    "https://images.unsplash.com/photo-1496147433903-1e62fdb6f4be?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1647367295787-9c217cb89efa?auto=format&fit=crop&w=900&q=82",
  ],
  Calculators: [photos.calculator, photos.calculator, photos.calculator],
  "Hostel Essentials": [
    photos.lamp,
    "https://images.unsplash.com/photo-1718369400759-7680a66ced99?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1624666366381-5a36bf123c59?auto=format&fit=crop&w=900&q=82",
  ],
  Electronics: [
    photos.headphones,
    "https://images.unsplash.com/photo-1757168120889-4317e57a4849?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1684717417811-253779ad3c5e?auto=format&fit=crop&w=900&q=82",
  ],
  Furniture: [photos.shelf, photos.shelf, photos.shelf],
  Sports: [
    photos.sports,
    "https://images.unsplash.com/photo-1721760886493-61c47c1caec9?auto=format&fit=crop&w=900&q=82",
    photos.sports,
  ],
};

type Product = {
  id: number;
  title: string;
  description?: string;
  price: string;
  condition: "New" | "Used";
  category: string;
  image: string;
  images?: string[];
  status?: "Available" | "Reserved" | "Sold";
};

const featuredProducts: Product[] = [
  { id: 1, title: "Engineering Mathematics Textbook", price: "₹250", condition: "Used", category: "Books", image: photos.books },
  { id: 2, title: "Urban Commuter Cycle", price: "₹2,800", condition: "Used", category: "Cycles", image: photos.cycle },
  { id: 3, title: "Scientific Calculator FX-991ES", price: "₹450", condition: "Used", category: "Calculators", image: photos.calculator },
  { id: 4, title: "Minimal Study Table Lamp", price: "₹300", condition: "Used", category: "Hostel Essentials", image: photos.lamp },
  { id: 5, title: "Wireless Over-ear Headphones", price: "₹799", condition: "New", category: "Electronics", image: photos.headphones },
  { id: 6, title: "Hostel Storage Shelf", price: "₹500", condition: "Used", category: "Furniture", image: photos.shelf },
  { id: 7, title: "Badminton Racquet Set", price: "₹600", condition: "Used", category: "Sports", image: photos.sports },
  { id: 8, title: "Programming in C++ Textbook", price: "₹350", condition: "Used", category: "Books", image: photos.programming },
];

const listingGroups = [
  {
    category: "Books",
    image: photos.books,
    basePrice: 180,
    names: ["Applied Physics Reference Book", "Digital Logic Design Textbook", "Data Structures Study Guide", "Signals and Systems Notes", "Engineering Drawing Handbook", "Probability and Statistics Book"],
  },
  {
    category: "Electronics",
    image: photos.headphones,
    basePrice: 650,
    names: ["Bluetooth Neckband Earphones", "Portable Bluetooth Speaker", "USB-C Multiport Hub", "Wireless Computer Mouse", "Mechanical Keyboard", "Power Bank 10000mAh", "Laptop Cooling Pad"],
  },
  {
    category: "Cycles",
    image: photos.cycle,
    basePrice: 2200,
    names: ["Single Speed Campus Cycle", "Blue City Commuter Cycle", "Mountain Cycle 21-Speed", "Lightweight Road Cycle", "Daily Use Hostel Cycle", "Hybrid Cycle with Carrier", "Recently Serviced City Bike"],
  },
  {
    category: "Hostel Essentials",
    image: photos.lamp,
    basePrice: 220,
    names: ["Rechargeable Study Lamp", "Adjustable LED Desk Light", "Extension Board with USB", "Electric Kettle 1.5L", "Compact Table Fan", "Laundry Drying Stand", "Bedside Reading Lamp"],
  },
  {
    category: "Furniture",
    image: photos.shelf,
    basePrice: 450,
    names: ["Three-Tier Storage Rack", "Compact Study Table", "Foldable Hostel Chair", "Bedside Storage Cabinet", "Metal Bookshelf", "Portable Laptop Table", "Wooden Shoe Rack"],
  },
  {
    category: "Sports",
    image: photos.sports,
    basePrice: 380,
    names: ["Badminton Racquet Pair", "Cricket Bat and Ball Set", "Football Size Five", "Table Tennis Racquet Set", "Yoga Mat with Carry Strap", "Basketball Training Ball", "Skipping Rope and Grips"],
  },
  {
    category: "Calculators",
    image: photos.calculator,
    basePrice: 320,
    names: ["Casio Scientific Calculator", "Engineering Calculator FX-82MS", "Calculator with Protective Case", "Scientific Calculator FX-991CW", "Basic Desktop Calculator", "Graphing Calculator", "Exam-Ready Scientific Calculator"],
  },
  {
    category: "Other",
    image: photos.shelf,
    basePrice: 150,
    names: ["Steel Water Bottle", "College Backpack", "Umbrella with Cover", "Lab Coat Size Medium", "Drawing Board and Clips", "Reusable Lunch Box", "Desk Organiser Set", "Travel Mug with Lid"],
  },
] as const;

const additionalProducts: Product[] = listingGroups.flatMap((group) =>
  group.names.map((title, index) => ({
    id: 9 + listingGroups.slice(0, listingGroups.indexOf(group)).reduce((total, item) => total + item.names.length, 0) + index,
    title,
    price: `₹${(group.basePrice + index * 90).toLocaleString("en-IN")}`,
    condition: index % 5 === 4 ? "New" as const : "Used" as const,
    category: group.category,
    image: group.image,
  })),
);

// Live products are loaded from FastAPI, not the Figma demo dataset.
const ProductsContext = createContext<Product[]>([]);
const useProducts = () => useContext(ProductsContext);

const categoryImages: Record<string, string> = {
  Books: photos.books,
  Electronics: photos.headphones,
  Furniture: photos.shelf,
  Cycles: photos.cycle,
  Stationery: photos.calculator,
  "Hostel Essentials": photos.lamp,
  Other: photos.shelf,
};

const cartStorageKey = "peermart-cart-items";
const favouriteStorageKey = "peermart-favourite-items";
const negotiationStorageKey = "peermart-negotiation-items";

function readCartIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(cartStorageKey);
    return stored ? JSON.parse(stored) as number[] : [];
  } catch {
    return [];
  }
}

function readFavouriteIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(favouriteStorageKey);
    return stored ? JSON.parse(stored) as number[] : [];
  } catch {
    return [];
  }
}

function readNegotiationIds() {
  if (typeof window === "undefined") return [2];
  try {
    const stored = window.localStorage.getItem(negotiationStorageKey);
    return stored ? JSON.parse(stored) as number[] : [2];
  } catch {
    return [2];
  }
}

type CartContextValue = {
  cartIds: number[];
  favouriteIds: number[];
  negotiationIds: number[];
  isLoggedIn: boolean;
  authLoading: boolean;
  addToCart: (id: number) => void;
  removeFromCart: (id: number) => void;
  toggleFavourite: (id: number) => void;
  addNegotiation: (id: number) => void;
  removeNegotiation: (id: number) => void;
  setLoggedIn: (loggedIn: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within the PeerMart layout");
  return context;
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
  const { cartIds, isLoggedIn } = useCart();
  const cartCount = cartIds.length;
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
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <Link to="/cart" className="icon-link" aria-label={`My cart with ${cartCount} items`}><ShoppingCart size={19} />{cartCount > 0 && <span className="cart-dot">{cartCount}</span>}</Link>
          <Link to="/sell" className="btn btn-primary nav-sell"><Tag size={16} /> Sell an Item</Link>
          {isLoggedIn ? (
            <Link to="/profile" className="avatar" aria-label="My profile">SA</Link>
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
        <div><h4>PeerMart</h4><Link to="/terms">Terms & conditions</Link></div>
        <div><h4>Need help?</h4><p>Contact your campus administrator</p><span className="muted">admin@iitdh.ac.in</span></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 PeerMart. Campus community marketplace.</span><span>Buy smart · Sell easy · Reuse more</span></div>
    </footer>
  );
}

function Layout() {
  const location = useLocation();
  const admin = location.pathname.startsWith("/admin");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    let active = true;
    fetchProducts(categoryImages)
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((error) => {
        if (active) setProductsError(String(error));
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => { active = false; };
  }, []);
  const [cartIds, setCartIds] = useState<number[]>(readCartIds);
  const [favouriteIds, setFavouriteIds] = useState<number[]>(readFavouriteIds);
  const [negotiationIds, setNegotiationIds] = useState<number[]>(readNegotiationIds);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then(() => {
        if (active) setIsLoggedIn(true);
      })
      .catch(() => {
        if (active) setIsLoggedIn(false);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartIds));
  }, [cartIds]);

  useEffect(() => {
    window.localStorage.setItem(favouriteStorageKey, JSON.stringify(favouriteIds));
  }, [favouriteIds]);

  useEffect(() => {
    window.localStorage.setItem(negotiationStorageKey, JSON.stringify(negotiationIds));
  }, [negotiationIds]);



  const cart = {
    cartIds,
    favouriteIds,
    negotiationIds,
    isLoggedIn,
    authLoading,
    addToCart: (id: number) => setCartIds((current) => current.includes(id) ? current : [...current, id]),
    removeFromCart: (id: number) => setCartIds((current) => current.filter((cartId) => cartId !== id)),
    toggleFavourite: (id: number) => setFavouriteIds((current) => current.includes(id) ? current.filter((favouriteId) => favouriteId !== id) : [...current, id]),
    addNegotiation: (id: number) => setNegotiationIds((current) => current.includes(id) ? current : [...current, id]),
    removeNegotiation: (id: number) => setNegotiationIds((current) => current.filter((negotiationId) => negotiationId !== id)),
    setLoggedIn: setIsLoggedIn,
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

function ProductCard({ product }: { product: Product }) {
  const { favouriteIds, toggleFavourite } = useCart();
  const runProtectedAction = useProtectedAction();
  const liked = favouriteIds.includes(product.id);
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={`/product/${product.id}`}><img src={product.image} alt={product.title} className="product-image" /></Link>
        <button className={liked ? "heart liked" : "heart"} onClick={() => runProtectedAction(() => toggleFavourite(product.id))} aria-label={liked ? "Remove from favourites" : "Add to favourites"}>
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
    const submittedQuery = query.trim() || "used cycle under ₹3,000";
    if (onSearch) {
      onSearch(submittedQuery);
      return;
    }
    navigate(`/ai-search?q=${encodeURIComponent(submittedQuery)}`);
  };
  return (
    <form className={large ? "smart-search smart-search-large" : "smart-search"} onSubmit={submit}>
      <Sparkles className="search-sparkle" size={20} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a used cycle under ₹3,000…" aria-label="Search with AI" />
      <Button type="submit" icon={<Search size={18} />}>Search with AI</Button>
    </form>
  );
}

function HomePage() {
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

      <section className="section container" id="how">
        <SectionHeading eyebrow="Simple & safe" title="How PeerMart works" copy="A straightforward way to find, connect, and reuse on campus." />
        <div className="steps">
          {[
            [Search, "Discover", "Search affordable products listed by fellow students on your campus."],
            [Mail, "Make an offer", "Contact the seller with your college email and agree on a fair price."],
            [Recycle, "Meet & reuse", "Arrange a safe campus handover and give a good item its next chapter."],
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
  category,
  maximumPrice,
  condition,
  onCategoryChange,
  onMaximumPriceChange,
  onConditionChange,
  onSearch,
}: {
  category: string;
  maximumPrice: string;
  condition: string;
  onCategoryChange: (value: string) => void;
  onMaximumPriceChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="filter-card">
      <label className="field"><span>Category</span><div className="select-wrap"><select value={category} onChange={(event) => onCategoryChange(event.target.value)}><option>All categories</option>{listingGroups.map((group) => <option key={group.category}>{group.category}</option>)}</select><ChevronDown size={16} /></div></label>
      <label className="field"><span>Maximum price</span><div className="input-wrap"><span>₹</span><input type="number" min="0" placeholder="3,000" value={maximumPrice} onChange={(event) => onMaximumPriceChange(event.target.value)} /></div></label>
      <label className="field"><span>Condition</span><div className="select-wrap"><select value={condition} onChange={(event) => onConditionChange(event.target.value)}><option>All conditions</option><option>New</option><option>Used</option></select><ChevronDown size={16} /></div></label>
      <Button icon={<Search size={17} />} onClick={onSearch}>Search</Button>
    </div>
  );
}

function BrowsePage() {
  const products = useProducts();
  const [page, setPage] = useState(1);
  const pageSize = 16;
  const [sort, setSort] = useState("Newest");
  const [category, setCategory] = useState("All categories");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [condition, setCondition] = useState("All conditions");
  const [appliedFilters, setAppliedFilters] = useState({ category, maximumPrice, condition });
  const visibleProducts = products
    .filter((product) => {
      const numericPrice = Number(product.price.replace(/[₹,]/g, ""));
      const matchesCategory = appliedFilters.category === "All categories" || product.category === appliedFilters.category;
      const matchesPrice = !appliedFilters.maximumPrice || numericPrice <= Number(appliedFilters.maximumPrice);
      const matchesCondition = appliedFilters.condition === "All conditions" || product.condition === appliedFilters.condition;
      return matchesCategory && matchesPrice && matchesCondition;
    })
    .sort((first, second) => {
      if (sort === "Newest") return first.id - second.id;
      const firstPrice = Number(first.price.replace(/[₹,]/g, ""));
      const secondPrice = Number(second.price.replace(/[₹,]/g, ""));
      return sort === "Price: low to high" ? firstPrice - secondPrice : secondPrice - firstPrice;
    });

  const totalPages = Math.ceil(visibleProducts.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedProducts = visibleProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      <PageHero eyebrow="Campus marketplace" title="Find your next campus essential" copy="Search by product, category, price, or condition. Every listing is a unique item from a student seller." />
      <section className="container content-section">
        <FilterBar category={category} maximumPrice={maximumPrice} condition={condition} onCategoryChange={setCategory} onMaximumPriceChange={setMaximumPrice} onConditionChange={setCondition} onSearch={() => setAppliedFilters({ category, maximumPrice, condition })} />
        <div className="results-head"><div><h2>Campus listings</h2><p>{visibleProducts.length} available {visibleProducts.length === 1 ? "item" : "items"}</p></div><label className="sort">Sort by <select value={sort} onChange={(e) => setSort(e.target.value)}><option>Newest</option><option>Price: low to high</option><option>Price: high to low</option></select></label></div>
        {visibleProducts.length > 0 ? (
          <div className="product-grid">{paginatedProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div>
        ) : (
          <div className="empty-state soft"><span className="empty-icon"><Search /></span><h2>No matching items</h2><p>Try a different category, price, or condition.</p><Button onClick={() => { setCategory("All categories"); setMaximumPrice(""); setCondition("All conditions"); setAppliedFilters({ category: "All categories", maximumPrice: "", condition: "All conditions" }); }}>Clear filters</Button></div>
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
            {["Used textbooks under ₹500", "A cycle below ₹3,000", "Calculator for engineering", "A lamp for my hostel"].map((chip) => (
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
          <div className="empty-state soft"><span className="empty-icon"><Sparkles /></span><h2>Your matches will appear here</h2><p>Try a complete thought like “used textbooks under ₹500” for better results.</p></div>
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
    cycles: { title: "Cycles", category: "Cycles & Accessories", copy: "Browse pre-loved cycles from students nearby—affordable, practical, and ready for another ride." },
    hostel: { title: "Hostel Essentials", category: "Daily Use & Hostel Essentials", copy: "Make hostel life easier with practical items from students on campus." },
    clothing: { title: "Clothing & Fashion", category: "Clothing & Fashion", copy: "Explore clothing and fashion items from students." },
    stationery: { title: "Stationery & Academic Accessories", category: "Stationery & Academic Accessories", copy: "Find stationery and academic accessories." },
    sports: { title: "Sports Equipment", category: "Sports & Fitness", copy: "Get active with affordable sports gear from fellow students." },

    other: { title: "Other Items", category: "Other", copy: "Discover more useful campus finds that do not fit the usual categories." },
  };
  const details = categoryDetails[slug] ?? categoryDetails.cycles;
  const [maximumPrice, setMaximumPrice] = useState("");
  const [condition, setCondition] = useState("All conditions");
  const [appliedMaximum, setAppliedMaximum] = useState("");
  const [appliedCondition, setAppliedCondition] = useState("All conditions");
  const categoryProducts = products.filter((product) => product.category === details.category);
  const visibleProducts = categoryProducts.filter((product) => {
    const numericPrice = Number(product.price.replace(/[₹,]/g, ""));
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
  const product = products.find((item) => item.id === Number(id)) ?? products[1];
  const galleryImages = (
    product.images?.length
      ? product.images
      : [product.image]
  ).map((src, index) => ({
    src,
    alt: `${product.title} product view ${index + 1}`,
  }));
  const [imageIndex, setImageIndex] = useState(0);
  const [offer, setOffer] = useState<"idle" | "confirm" | "sent">("idle");
  const { cartIds, favouriteIds, negotiationIds, addToCart, toggleFavourite, addNegotiation } = useCart();
  const runProtectedAction = useProtectedAction();
  const inCart = cartIds.includes(product.id);
  const liked = favouriteIds.includes(product.id);
  const offerSent = negotiationIds.includes(product.id);
  const canPurchase = product.status === "Available";
  return (
    <section className="container product-page">
      <Link to="/browse" className="back-link"><ArrowLeft size={17} /> Back to listings</Link>
      <div className="product-detail">
        <div className="gallery">
          <div className="main-image">
            <img src={galleryImages[imageIndex].src} alt={galleryImages[imageIndex].alt} key={galleryImages[imageIndex].src} />
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
          <div className="detail-topline"><StatusBadge tone={product.status === "Available" ? "green" : product.status === "Reserved" ? "amber" : "slate"}>{product.status ?? "Unknown"}</StatusBadge></div>
          <h1>{product.title}</h1>
          <div className="detail-price">{product.price} {product.status === "Available" && <span>Negotiable</span>}</div>
          <div className="detail-tags"><span><Tag size={16} /> {product.category}</span><span><BadgeCheck size={16} /> {product.condition}</span></div>
          <div className="detail-section"><h3>About this item</h3><p>{product.description || "No description provided."}</p></div>
          <div className="seller-card"><ShieldCheck size={20} /><strong>Verified seller</strong></div>
          <div className="offer-actions">
            <Button className="grow" icon={offerSent ? <Check size={18} /> : <Mail size={18} />} onClick={() => runProtectedAction(() => setOffer("confirm"))} disabled={offerSent || !canPurchase}>Make an offer</Button>
            <Button variant="outline" icon={inCart ? <Check size={18} /> : <ShoppingCart size={18} />} onClick={() => runProtectedAction(() => addToCart(product.id))} disabled={inCart || !canPurchase}>{inCart ? "Added to Cart" : "Add to Cart"}</Button>
            <button className={liked ? "detail-heart liked" : "detail-heart"} onClick={() => runProtectedAction(() => toggleFavourite(product.id))} aria-label={liked ? "Remove from favourites" : "Add to favourites"} title={liked ? "Remove from favourites" : "Add to favourites"}>
              <Heart fill={liked ? "currentColor" : "none"} size={19} />
            </button>
          </div>
          <div className="safety-note"><ShieldCheck size={20} /><p><strong>Deal safely on campus.</strong> Agree on the price, meeting location, and handover directly. PeerMart does not process payment.</p></div>
        </div>
      </div>
      {offer !== "idle" && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setOffer("idle")}><X /></button>
            {offer === "confirm" ? (
              <><span className="modal-icon"><Mail /></span><h2>Send an offer request?</h2><p>The verified seller will be notified that you’re interested. This does not complete the sale or permanently reserve the item.</p><div className="modal-summary"><img src={product.image} alt="" /><div><strong>{product.title}</strong><span>Listed for {product.price}</span></div></div><div className="modal-actions"><Button variant="outline" onClick={() => setOffer("idle")}>Not now</Button><Button onClick={() => { addNegotiation(product.id); setOffer("sent"); }}>Send request</Button></div></>
            ) : (
              <><span className="modal-icon success"><Check /></span><h2>Offer requested</h2><p>The seller is ready to negotiate. Contact them using their verified college email.</p><div className="contact-box"><Mail size={19} /><div><small>Seller’s college email</small><strong>isha.bhardwaj@iitdh.ac.in</strong></div></div><div className="notice"><Clock3 size={18} /><span><strong>Reserved / negotiating</strong> is a communication status, not a completed sale. Only the seller can record the final transaction.</span></div><Link to="/orders" className="btn btn-primary full">Go to my orders</Link></>
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
  const { setLoggedIn } = useCart();
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
        await apiRegister({
          f_name: firstName.trim(),
          l_name: lastName.trim(),
          email: normalizedEmail,
          password,
          gender: gender || null,
          phone_no: phone.trim() || null,
          terms_accepted: accepted,
        });

        setLoggedIn(true);
        navigate(returnTo, { replace: true });
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again."
        );
      }

      return;
    }

    try {
      const user = await apiLogin(normalizedEmail, password);

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
          : "Login failed. Please try again."
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
          {register && <div className="form-row"><label className="field"><span>Gender</span><div className="select-wrap"><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select><ChevronDown size={16} /></div></label><label className="field"><span>Phone number</span><input required placeholder="+91 98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>}
          <label className="field"><span>College email ID</span><div className="input-icon"><Mail size={17} /><input required type="email" placeholder="name@iitdh.ac.in" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label className="field"><span>Password</span><div className="password-wrap"><input required minLength={8} type={show ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {register && <label className="field"><span>Re-enter password</span><input required minLength={8} type={show ? "text" : "password"} placeholder="Repeat password" value={reenteredPassword} onChange={(event) => setReenteredPassword(event.target.value)} /></label>}
          {register && <label className="check-row"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>I agree to the <Link to="/terms">Terms and Conditions</Link> and campus community rules.</span></label>}
          {authError && <div className="auth-error"><CircleHelp size={17} /><span>{authError}</span></div>}
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
  const [published, setPublished] = useState(false);
  if (published) return <section className="container content-section"><div className="success-panel"><span><Check /></span><h1>Your listing is live!</h1><p>Students can now discover your item. You’ll hear from interested buyers through your college email.</p><div><Link className="btn btn-primary" to="/sells">View my listings</Link><Link className="btn btn-outline" to="/sell">List another item</Link></div></div></section>;
  return (
    <>
      <PageHero eyebrow="Sell on PeerMart" title="List your item" copy="Give something useful a second life. Clear photos and honest details help your item sell faster." />
      <section className="container form-layout">
        <form className="listing-form" onSubmit={(e) => { e.preventDefault(); setPublished(true); }}>
          <div className="form-section"><div className="form-section-title"><span>1</span><div><h2>Item details</h2><p>Tell students what you’re offering.</p></div></div><label className="field"><span>Category *</span><div className="select-wrap"><select required><option value="">Choose a category</option><option>Books</option><option>Electronics</option><option>Cycles</option><option>Hostel Essentials</option><option>Furniture</option><option>Sports</option><option>Calculators</option><option>Other</option></select><ChevronDown size={16} /></div></label><label className="field"><span>Product title *</span><input required placeholder="e.g. Urban commuter cycle" /><small>Use a clear, specific title.</small></label><label className="field"><span>Description *</span><textarea required rows={5} placeholder="Describe condition, age, features, and any signs of use…" /><small>Be honest about marks or defects.</small></label><div className="form-row"><label className="field"><span>Listed price *</span><div className="input-wrap"><span>₹</span><input required type="number" placeholder="0" /></div></label><fieldset className="field"><legend>Condition *</legend><div className="radio-group"><label><input type="radio" name="condition" defaultChecked /> Used</label><label><input type="radio" name="condition" /> New</label></div></fieldset></div></div>
          <div className="form-section"><div className="form-section-title"><span>2</span><div><h2>Add product photos</h2><p>Upload 2–5 clear images from different angles.</p></div></div><label className="upload-zone"><UploadCloud size={30} /><strong>Drop photos here or click to browse</strong><span>JPG or PNG · minimum 2, maximum 5</span><input type="file" multiple /></label><div className="upload-preview"><div><img src={photos.cycle} alt="Uploaded cycle" /><span className="cover-label">Cover</span><button type="button"><Trash2 size={15} /></button></div><div><img src={objectGalleries.Cycles[1]} alt="Uploaded cycle detail" /><button type="button"><Trash2 size={15} /></button></div></div></div>
          <div className="submit-row"><Link to="/" className="btn btn-ghost">Cancel</Link><Button type="submit" icon={<UploadCloud size={18} />}>Publish listing</Button></div>
        </form>
        <aside className="form-tips"><h3><Sparkles size={18} /> Tips for a great listing</h3><ul><li><Check /> Use bright, clear photos</li><li><Check /> Mention any defects</li><li><Check /> Set a fair student price</li><li><Check /> Never share personal payment details</li></ul><div className="eco-tip"><Leaf /><strong>Why reuse?</strong><p>Every item sold keeps useful materials in circulation and helps another student spend less.</p></div></aside>
      </section>
    </>
  );
}

function DashboardShell({ title, copy, children }: { title: string; copy: string; children: ReactNode }) {
  return <><PageHero title={title} copy={copy} /><section className="container dashboard-content"><aside className="account-nav">{[["Profile", "/profile", User], ["My orders", "/orders", ShoppingBag], ["My Sell", "/sells", Store], ["Favourites", "/favourites", Heart], ["My cart", "/cart", ShoppingCart]].map(([label, to, Icon]) => { const I = Icon as typeof User; return <NavLink to={to as string} key={label as string}><I size={18} />{label as string}</NavLink>; })}</aside><div className="dashboard-main">{children}</div></section></>;
}

function ProfilePage() {
  const navigate = useNavigate();
  const { setLoggedIn } = useCart();
  const [currentUser, setCurrentUser] = useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(console.error);
  }, []);

  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saved, setSaved] = useState(false);
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
        error instanceof Error ? error.message : "Profile update failed"
      );
    }
  };

  return (
    <DashboardShell title="My profile" copy="Manage your account and marketplace activity.">
      {saved && <div className="save-confirmation"><Check size={17} /> Profile updated successfully.</div>}
      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">{profile.firstName.charAt(0)}{profile.lastName.charAt(0)}</div>
          <div><h2>{profile.firstName} {profile.lastName}</h2><p><ShieldCheck size={15} /> Verified campus member</p></div>
          <Button variant="outline" onClick={openEditor}>Edit profile</Button>
        </div>
        <div className="info-grid">
          <div><span>College email</span><strong>{currentUser?.email ?? "Loading..."}</strong></div>
          <div><span>Phone number</span><strong>{profile.phone}</strong></div>
        </div>
      </div>
      <div className="dashboard-cards">
        <Link to="/orders"><ShoppingBag /><strong>My orders</strong><span>2 active negotiations</span></Link>
        <Link to="/sells"><Store /><strong>My Sell</strong><span>4 active listings</span></Link>
        <Link to="/favourites"><Heart /><strong>Favourites</strong><span>6 saved items</span></Link>
      </div>
      <div className="support-card"><CircleHelp /><div><strong>Need help?</strong><p>Contact your campus administrator at <b>admin@iitdh.ac.in</b></p></div></div>
      <Button variant="danger" icon={<LogOut size={17} />} onClick={() => setLoggingOut(true)}>Log out</Button>

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
                      : "Logout failed. Please try again."
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

const productSellers = [
  { name: "Isha Bhardwaj", email: "isha.bhardwaj@iitdh.ac.in" },
  { name: "Radhemohan Yadav", email: "radhemohan.yadav@iitdh.ac.in" },
  { name: "Ameya Ghadge", email: "ameya.ghadge@iitdh.ac.in" },
];

function OrderRow({ product, sold = false, onRemove }: { product: Product; sold?: boolean; onRemove?: () => void }) {
  const [showContact, setShowContact] = useState(false);
  const seller = sold ? productSellers[1] : productSellers[(product.id - 1) % productSellers.length];
  return (
    <>
      <div className="order-row"><img src={product.image} alt={product.title} /><div className="order-info"><div><h3>{product.title}</h3><p>Seller: {seller.name} · {sold ? "₹225 final price" : `${product.price} listed price`}</p></div><StatusBadge tone={sold ? "green" : "amber"}>{sold ? "Completed" : "Negotiating"}</StatusBadge></div><div className="order-actions">{sold ? <Link to="/receipt" className="btn btn-outline"><FileText size={16} /> View receipt</Link> : <><Button variant="outline" icon={<Mail size={16} />} onClick={() => setShowContact(true)}>Contact seller</Button><Button variant="danger" onClick={onRemove}>Remove from negotiation</Button><Link to={`/product/${product.id}`} className="text-link">View item</Link></>}</div></div>
      {showContact && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setShowContact(false)}><X /></button>
            <span className="modal-icon"><Mail /></span>
            <h2>Contact seller</h2>
            <p>Use the seller’s verified IIT Dharwad email address to continue your negotiation.</p>
            <div className="contact-box"><Mail size={19} /><div><small>{seller.name} · verified college email</small><strong>{seller.email}</strong></div></div>
            <div className="modal-actions"><Button onClick={() => setShowContact(false)}>Done</Button></div>
          </div>
        </div>
      )}
    </>
  );
}

function OrdersPage() {
  const products = useProducts();
  const { negotiationIds, removeNegotiation } = useCart();
  const negotiationProducts = negotiationIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  return (
    <DashboardShell title="My orders" copy="Track negotiations and completed campus deals.">
      <SectionHeading title="Negotiating" copy="Every offer request that is still being discussed with a seller." />
      {negotiationProducts.length > 0 ? (
        negotiationProducts.map((product) => <OrderRow product={product} onRemove={() => removeNegotiation(product.id)} key={product.id} />)
      ) : (
        <div className="empty-state soft"><span className="empty-icon"><ShoppingBag /></span><h2>No active negotiations</h2><p>Make an offer on any available item and it will appear here.</p><Link to="/browse" className="btn btn-primary">Browse available items</Link></div>
      )}
      <SectionHeading title="Completed purchases" copy="Finalized deals recorded by the seller." />
      {/* Completed sales will be loaded from the sales API later. */}
    </DashboardShell>
  );
}

function SellsPage() {
  const [tab, setTab] = useState<"available" | "negotiating" | "sold">("available");
  const [record, setRecord] = useState(false);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [negotiationRemoved, setNegotiationRemoved] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [listingRemoved, setListingRemoved] = useState(false);
  const listing = tab === "sold"
    ? { title: "Engineering Mathematics Textbook", price: "₹225", image: photos.books, status: "Sold" }
    : { title: "Urban Commuter Cycle", price: "₹2,800", image: photos.cycle, status: tab === "available" ? "Available" : "Negotiating" };

  return (
    <DashboardShell title="My Sell" copy="Manage your listings and record completed student-to-student deals.">
      <div className="seller-page-head">
        <div><strong>Your listings</strong><span>Create, edit, and track every item you’re selling.</span></div>
        <Link to="/sell" className="btn btn-primary"><Tag size={16} /> Add New Listing</Link>
      </div>
      <div className="tab-bar">
        <button className={tab === "available" ? "active" : ""} onClick={() => setTab("available")}>Available <span>{listingRemoved ? 0 : 1}</span></button>
        <button className={tab === "negotiating" ? "active" : ""} onClick={() => setTab("negotiating")}>Negotiating <span>{negotiationRemoved ? 0 : 1}</span></button>
        <button className={tab === "sold" ? "active" : ""} onClick={() => setTab("sold")}>Sold <span>1</span></button>
      </div>

      {saved && <div className="save-confirmation"><Check size={17} /> Listing changes saved successfully.</div>}
      {negotiationRemoved && tab === "available" && <div className="save-confirmation"><Check size={17} /> Negotiation removed. The listing is available again.</div>}

      {tab === "available" && listingRemoved ? (
        <div className="empty-state soft"><span className="empty-icon"><Trash2 /></span><h2>Listing removed</h2><p>This item is no longer visible in your available listings.</p><Link to="/sell" className="btn btn-primary">Add a new listing</Link></div>
      ) : tab === "negotiating" && negotiationRemoved ? (
        <div className="empty-state soft"><span className="empty-icon"><Check /></span><h2>No active negotiations</h2><p>Your removed listing is available to other buyers again.</p></div>
      ) : <div className="seller-listing-card">
        <img src={listing.image} alt={listing.title} />
        <div className="seller-listing-info">
          <div className="seller-listing-heading">
            <div><h3>{listing.title}</h3></div>
            <StatusBadge tone={tab === "available" ? "green" : tab === "negotiating" ? "amber" : "slate"}>{listing.status}</StatusBadge>
          </div>
          <p>{listing.price} · Used · {tab === "sold" ? "Books & study materials" : "Cycles"}</p>
          <div className="seller-listing-actions">
            {tab === "available" && <><Button variant="outline" onClick={() => { setSaved(false); setEditing(true); }}>Edit listing</Button><Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmingRemoval(true)}>Remove listing</Button></>}
            {tab === "negotiating" && <><Button onClick={() => setRecord(true)} icon={<ClipboardCheck size={16} />}>Record sale</Button><Button variant="danger" onClick={() => { setNegotiationRemoved(true); setTab("available"); }}>Remove from negotiation</Button></>}
            {tab === "sold" && <Link to="/receipt" className="btn btn-outline"><FileText size={16} /> View receipt</Link>}
            {tab !== "sold" && <Link to="/product/2" className="text-link">View details <ArrowRight size={15} /></Link>}
          </div>
        </div>
      </div>}

      {editing && (
        <div className="modal-backdrop">
          <form className="modal edit-listing-modal" onSubmit={(event) => { event.preventDefault(); setEditing(false); setSaved(true); }}>
            <button type="button" className="modal-close" onClick={() => setEditing(false)}><X /></button>
            <span className="modal-icon"><Tag /></span>
            <h2>Edit listing</h2>
            <p>Update the item information students will see in search results.</p>
            <label className="field"><span>Product title</span><input required defaultValue="Urban Commuter Cycle" /></label>
            <div className="form-row">
              <label className="field"><span>Price</span><div className="input-wrap"><span>₹</span><input required type="number" defaultValue="2800" /></div></label>
              <label className="field"><span>Condition</span><div className="select-wrap"><select defaultValue="Used"><option>Used</option><option>New</option></select><ChevronDown /></div></label>
            </div>
            <label className="field"><span>Description</span><textarea required rows={4} defaultValue="Well-maintained single-speed cycle, ideal for getting around campus. Recently serviced with working brakes." /></label>
            <div className="modal-actions"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit">Save changes</Button></div>
          </form>
        </div>
      )}

      {confirmingRemoval && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setConfirmingRemoval(false)}><X /></button>
            <span className="modal-icon logout-icon"><Trash2 /></span>
            <h2>Remove this listing?</h2>
            <p><strong>Urban Commuter Cycle</strong> will be removed from your available listings and will no longer be visible to buyers.</p>
            <div className="modal-actions"><Button variant="outline" onClick={() => setConfirmingRemoval(false)}>Cancel</Button><Button variant="danger" onClick={() => { setListingRemoved(true); setConfirmingRemoval(false); }}>Remove listing</Button></div>
          </div>
        </div>
      )}

      {record && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setRecord(false)}><X /></button>{!done ? <><span className="modal-icon"><ClipboardCheck /></span><h2>Record completed sale</h2><p>Only confirm after you and the buyer have agreed on the final price and completed the handover.</p><label className="field"><span>Interested buyer</span><div className="select-wrap"><select><option>Siddhi Avhad · siddhi.avhad@iitdh.ac.in</option></select><ChevronDown /></div></label><label className="field"><span>Final agreed price</span><div className="input-wrap"><span>₹</span><input defaultValue="2600" /></div></label><label className="check-row"><input type="checkbox" /><span>I confirm the item was handed over and this sale is complete.</span></label><Button className="full" onClick={() => setDone(true)}>Confirm & generate receipt</Button></> : <><span className="modal-icon success"><Check /></span><h2>Sale recorded</h2><p>The item is now marked sold and removed from available results. A receipt has been generated for both students.</p><Link to="/receipt" className="btn btn-primary full">View receipt</Link></>}</div></div>}
    </DashboardShell>
  );
}

function FavouritesPage() {
  const products = useProducts();
  const { favouriteIds } = useCart();
  const favouriteProducts = favouriteIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
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
  const cartItems = cartIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  const subtotal = cartItems.reduce((total, item) => total + Number(item.price.replace(/[₹,]/g, "")), 0);

  return (
    <DashboardShell title="My cart" copy="Items you’re considering. Each listing is one unique item.">
      <div className="cart-note"><CircleHelp /><span>Adding an item does not reserve it or guarantee availability. Only currently available listings can remain in your cart.</span></div>
      {cartItems.length > 0 ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item, index) => (
              <article className="cart-item" key={item.id}>
                <img src={item.image} alt={item.title} />
                <div className="cart-item-main">
                  <div className="cart-item-title">
                    <div><span>{item.category} · {item.condition}</span><h3>{item.title}</h3></div>
                    <StatusBadge>Available</StatusBadge>
                  </div>
                  <p>Seller: {index === 0 ? "Isha Bhardwaj" : "Radhemohan Yadav"} · IIT DH verified</p>
                  <div className="cart-item-bottom">
                    <strong>{item.price}</strong>
                    <div>
                      <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => removeFromCart(item.id)}>Remove</Button>
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
  return <section className="receipt-page container"><div className="receipt-actions"><Link to="/orders" className="back-link"><ArrowLeft /> Back to orders</Link><div><Button variant="outline" icon={<Printer size={16} />}>Print</Button><Button icon={<Download size={16} />}>Save PDF</Button></div></div><article className="receipt"><div className="receipt-head"><Logo /><StatusBadge>Completed</StatusBadge></div><div className="receipt-title"><span>TRANSACTION RECORD</span><h1>Peer-to-peer sale receipt</h1><p>Transaction PM-2026-02184 · 16 February 2026</p></div><div className="receipt-product"><img src={photos.books} alt="" /><div><span>Product</span><h2>Engineering Mathematics Textbook</h2><p>Used · Books & study materials</p></div><strong>₹225</strong></div><div className="receipt-parties"><div><span>SELLER</span><strong>Radhemohan Yadav</strong><p>radhemohan.yadav@iitdh.ac.in<br />IIT DH</p></div><ArrowRight /><div><span>BUYER</span><strong>Siddhi Avhad</strong><p>siddhi.avhad@iitdh.ac.in<br />IIT DH</p></div></div><div className="receipt-total"><span>Final agreed price</span><strong>₹225.00</strong></div><div className="receipt-disclaimer"><ShieldCheck /><p>This is a record of an offline peer-to-peer transaction. PeerMart connected the students but did not process or hold payment.</p></div></article></section>;
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const user = await apiLogin(email.trim().toLowerCase(), password);

      if (user.role !== "admin") {
        await apiLogout();
        setError("Administrator access is required.");
        return;
      }

      navigate("/admin", { replace: true });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Administrator login failed."
      );
    }
  };

  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <Logo />
        <div className="admin-login-title"><span>ADMINISTRATOR ACCESS</span><h1>PeerMart Admin</h1><p>Sign in to manage IIT DH users, listings, and categories.</p></div>
        <form className="form-stack" onSubmit={submit}>
          <label className="field"><span>Administrator email</span><div className="input-icon"><Mail size={17} /><input required type="email" placeholder="testadmin63@iitdh.ac.in" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label className="field"><span>Password</span><div className="password-wrap"><input required type={showPassword ? "text" : "password"} placeholder="Enter admin password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {error && <div className="auth-error"><CircleHelp size={17} /><span>{error}</span></div>}
          <Button type="submit" className="full" icon={<ShieldCheck size={17} />}>Sign in to dashboard</Button>
        </form>
        <div className="admin-security-note"><ShieldCheck size={17} /><p>Administrator access is separate from student accounts. Administrator credentials are verified by the PeerMart backend.</p></div>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Return to PeerMart</Link>
      </div>
      <aside className="admin-login-aside"><div><LayoutDashboard size={34} /><h2>Keep the marketplace safe and useful.</h2><p>Manage users, product listings, and marketplace categories from one dashboard.</p></div></aside>
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
  const { setLoggedIn } = useCart();
  const [view, setView] = useState<"overview" | "users" | "listings" | "categories">("overview");

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
        const [users, categories] = await Promise.all([
          getAdminUsers(),
          getAdminCategories(),
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

  const changeView = (nextView: "overview" | "users" | "listings" | "categories") => {
    setView(nextView);
    setSelectedUserId(null);
    setSelectedCategory(null);
  };

  const headings = {
    overview: ["Marketplace overview", "Monitor IIT DH marketplace activity and manage core records."],
    users: ["User management", "Review and manage registered IIT DH marketplace accounts."],
    listings: ["Listing management", "Review available products and remove inappropriate listings."],
    categories: ["Category management", "Manage the categories students use when listing products."],
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
        </nav>
        <div className="admin-user"><div>AD</div><span><strong>Campus Admin</strong><small>admin@iitdh.ac.in</small></span></div>
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
      { path: "*", element: <PageHero title="Page not found" copy="This campus path doesn’t exist yet." ><Link className="btn btn-primary" to="/">Back home</Link></PageHero> },
    ],
  },
]);
