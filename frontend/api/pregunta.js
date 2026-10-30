import { api } from "../api-consulta.js";

export function POST(request) {
  return api(request, process.env);
}
