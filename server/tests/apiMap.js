import { makeProduct } from "./helpers.js";

export const maybe = (condition) => (condition ? describe : describe.skip);
export const maybeIt = (condition) => (condition ? test : test.skip);

export const API = {
  auth: {
    register: "/api/auth/register",
    login: "/api/auth/login",
    me: "/api/users/me",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: (token) => `/api/auth/reset-password/${encodeURIComponent(token)}`,
    changePassword: { method: "put", path: "/api/users/me/password" },
    updateProfile: { method: "patch", path: "/api/users/me" },
    registerBody: (user) => ({
      name: user.name,
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    }),
    loginBody: (user) => ({ email: user.email, password: user.password }),
    changePasswordBody: (current, next) => ({ currentPassword: current, newPassword: next }),
    afterRegister: async () => {},
    getResetToken: null,
  },
  catalog: {
    list: "/api/products",
    detail: (slug) => `/api/products/${encodeURIComponent(slug)}`,
    params: { q: "search", category: "category", sort: "sort", page: "page", limit: "limit", minPrice: "minPrice", maxPrice: "maxPrice" },
    sorts: { priceAsc: "price_asc", priceDesc: "price_desc", newest: "newest" },
    categoryBy: "slug",
    categoryField: "category",
    productsOf: (res) => res.body.data?.products ?? res.body.products ?? [],
    totalOf: (res) => res.body.data?.pagination?.total,
    productOf: (res) => res.body.data?.product ?? res.body.product ?? res.body,
    productDefaults: async () => ({}),
  },
  checkout: {
    quote: "/api/checkout/quote",
    quoteOf: (res) => {
      const quote = res.body.quote ?? res.body;
      const totals = quote.totals ?? quote;
      return {
        ...quote,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        total: totals.total,
        discount: 0,
      };
    },
    optionsOf: (quote) => quote.shippingOptions ?? quote.options ?? [],
    optionId: (option) => option._id ?? option.id,
    selectedIdOf: (quote) => quote.selectedShippingMethod?._id ?? quote.selectedShippingMethod?.id ?? quote.selectedShippingId ?? null,
    address: (province = "Western Province") => ({
      fullName: "Nimal Perera",
      phone: "+94771234567",
      line1: "12 Galle Road",
      line2: "",
      city: "Colombo",
      province,
      postalCode: "00300",
      country: "Sri Lanka",
    }),
  },
};

export const userOf = (res) => res.body.user ?? res.body.data?.user ?? res.body.data ?? res.body;
export const sessionFrom = (res) => ({
  token: res.body?.accessToken ?? res.body?.token ?? res.body?.data?.accessToken ?? res.body?.data?.token,
  cookies: res.headers?.["set-cookie"],
});
export const withSession = (req, session) => {
  if (session.token) req.set("Authorization", `Bearer ${session.token}`);
  if (session.cookies?.length) {
    req.set("Cookie", session.cookies.map((cookie) => cookie.split(";")[0]).join("; "));
    req.set("X-Requested-With", "XMLHttpRequest");
  }
  return req;
};
export const newProduct = async (overrides = {}) =>
  makeProduct({ ...(await API.catalog.productDefaults()), ...overrides });
