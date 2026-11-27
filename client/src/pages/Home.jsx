import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getCategoryTree, getHome } from "../api/catalog";
import ProductSection, { ProductSectionSkeleton } from "../components/ProductSection";
import Alert from "../components/Alert";
import Seo from "../components/seo/Seo";
import { STORE } from "../config/store";
import { organizationSchema, websiteSchema } from "../seo/schema";

function HeroArtwork() {
  return (
    <div className="buyza-hero-art" aria-hidden="true">
      <span className="buyza-blob buyza-blob-one" />
      <span className="buyza-blob buyza-blob-two" />
      <span className="buyza-sun" />
      <svg className="buyza-hero-image" viewBox="0 0 360 360" role="presentation">
        <path d="M75 91 183 32l105 59-107 63z" fill="#fff" stroke="#aaa0b5" strokeWidth="2" />
        <path d="M75 91v112l106 62V154z" fill="#e8dcff" stroke="#aaa0b5" strokeWidth="2" />
        <path d="m181 154 107-63v112l-107 62z" fill="#c6a9ff" stroke="#aaa0b5" strokeWidth="2" />
        <path d="m155 47 108 60-25 15-108-60z" fill="#7839e9" />
        <path d="m130 60 25-13v121l-25-14z" fill="#632bcf" />
        <path d="m181 154 27-16v122l-27 16z" fill="#7d3de8" />
        <path d="m75 203 106 62v18L75 219z" fill="#fff" opacity=".8" />
        <path d="M182 32v30" stroke="#aaa0b5" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M288 91V49" stroke="#aaa0b5" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M75 91V49" stroke="#aaa0b5" strokeWidth="2" strokeDasharray="4 5" />
      </svg>
      <div className="buyza-floating-tag buyza-floating-tag-top">SHOP<br />JOYFULLY</div>
      <div className="buyza-art-card buyza-art-card-back">NEW<br />ARRIVALS</div>
    </div>
  );
}

export default function Home() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: getCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  const { data: home, isLoading, isError, refetch } = useQuery({
    queryKey: ["catalog", "home"],
    queryFn: getHome,
  });

  const categoryCards = [
    {
      category: categories.find((category) => category.name.toLowerCase().includes("electronics")),
      label: "Tech picks",
      tone: "tech",
      icon: "device",
      color: "text-[#6540c8]",
    },
    {
      category: categories.find((category) => category.name.toLowerCase().includes("fashion")),
      label: "Fashion",
      tone: "style",
      icon: "spark",
      color: "text-[#bd397b]",
    },
    {
      category: categories.find((category) => category.name.toLowerCase().includes("home")),
      label: "Home finds",
      tone: "home",
      icon: "house",
      color: "text-[#8b641b]",
    },
    {
      to: "/products?sort=bestselling",
      label: "Daily deals",
      tone: "deals",
      icon: "tag",
      color: "text-[#16818a]",
    },
  ].filter((card) => card.category || card.to);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  };

  return (
    <>
      <Seo
        title={`${STORE.name}: online shopping in Sri Lanka`}
        titleTemplate={false}
        description={STORE.description}
        path="/"
        jsonLd={[organizationSchema(), websiteSchema()]}
      />
      <main>
      <section className="buyza-hero relative mx-auto min-h-[490px] max-w-7xl overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-[490px] max-w-7xl items-center px-6 py-16 sm:px-12">
          <div className="-translate-y-8 max-w-2xl">
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-[#241b3b] sm:text-6xl lg:text-7xl">
              Find your
              <br />
              <span className="buyza-gradient-text">next favourite.</span>
            </h1>
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-7 flex w-full max-w-[42rem] items-center gap-2 rounded-full border border-white/80 bg-white p-2 pl-4 shadow-[0_12px_36px_rgba(54,36,95,0.14)] transition focus-within:border-[#b49aff] focus-within:ring-4 focus-within:ring-[#6d3df5]/10"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 shrink-0 text-[#8c817b]"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="What are you looking for?"
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#46382f] placeholder:text-[#8c817b] focus:outline-none sm:text-base"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-gradient-to-r from-[#6d3df5] to-[#b83fd1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d3df5] sm:px-7"
              >
                Search
              </button>
            </form>
            <div className="buyza-hero-cta-wrap mt-7">
              <span className="buyza-hero-cta-spark buyza-hero-cta-spark-one" aria-hidden="true">✦</span>
              <span className="buyza-hero-cta-spark buyza-hero-cta-spark-two" aria-hidden="true">✧</span>
              <span className="buyza-hero-cta-spark buyza-hero-cta-spark-three" aria-hidden="true">•</span>
              <Link
                to="/products"
                className="buyza-primary buyza-hero-cta inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-bold"
              >
                <span className="buyza-hero-cta-label">Start exploring</span>
                <span className="buyza-hero-cta-arrow" aria-hidden="true">↘</span>
              </Link>
            </div>
            {user && <p className="mt-4 text-sm text-[#6b665f]">Welcome back, {user.name}.</p>}
          </div>
          <HeroArtwork />
        </div>
      </section>

      {categoryCards.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-8 pt-8 sm:px-12">
          <p className="buyza-kicker">EXPLORE THE COLLECTION</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#241b3b]">Shop by category</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categoryCards.map((card) => {
              const { category, label, tone, icon, color, to } = card;
              return (
                <Link
                  key={label}
                  to={to || `/category/${category.slug}`}
                  className={`buyza-category-card buyza-category-card-${tone} group text-left text-[#241b3b]`}
                >
                  <span className={`buyza-category-icon buyza-category-icon-${tone} ${color}`} aria-hidden="true">
                    <span className={`buyza-icon-${icon}`} />
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-2 text-base font-extrabold sm:text-lg">
                    {label}
                    <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-12">
        {isLoading && (
          <>
            <ProductSectionSkeleton title="Featured" />
            <ProductSectionSkeleton title="New arrivals" />
            <ProductSectionSkeleton title="Best sellers" />
          </>
        )}

        {isError && (
          <div className="mt-10 space-y-2">
            <Alert>We couldn't load our products right now.</Alert>
            <button type="button" onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
              Try again
            </button>
          </div>
        )}

        {home && (
          <>
            <ProductSection title="Featured" products={home.featured} viewAllTo="/products?featured=true" />
            <ProductSection title="New arrivals" products={home.newArrivals} viewAllTo="/products" />
            <ProductSection
              title={home.bestSellersAreFallback ? "Popular picks" : "Best sellers"}
              products={home.bestSellers}
              viewAllTo="/products?sort=bestselling"
            />
          </>
        )}
      </div>
    </main>
    </>
  );
}
