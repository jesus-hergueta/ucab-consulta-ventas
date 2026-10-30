INSERT INTO storage.buckets (id, name, public)
VALUES ('trazas-agente', 'trazas-agente', false)
ON CONFLICT (id) DO NOTHING;
