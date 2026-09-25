import axios from "axios";

export const API = `${import.meta.env.VITE_API_URL || 'https://school-admin-hub-3.onrender.com'}/api`;


const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function money(n, cur = "USD") {
  const v = Number(n || 0);
  if (cur === "FC") return `${Math.round(v).toLocaleString("fr-FR")} FC`;
  return `$${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const MONTHS = [
  ["sept", "Septembre"], ["oct", "Octobre"], ["nov", "Novembre"], ["dec", "Décembre"],
  ["jan", "Janvier"], ["fev", "Février"], ["mars", "Mars"], ["avr", "Avril"],
  ["mai", "Mai"], ["juin", "Juin"],
];
export const MONTH_LABELS = Object.fromEntries(MONTHS);

export function formatApiError(detail) {
  if (detail == null) return "Une erreur est survenue.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default api;
