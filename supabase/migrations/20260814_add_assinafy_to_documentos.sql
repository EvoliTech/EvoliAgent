-- Adicionar colunas de integração com Assinafy na tabela documentos
ALTER TABLE public.documentos
ADD COLUMN IF NOT EXISTS assinafy_document_id TEXT,
ADD COLUMN IF NOT EXISTS assinafy_status TEXT;
