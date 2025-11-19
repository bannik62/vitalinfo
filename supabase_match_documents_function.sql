-- Fonction pour la recherche vectorielle avec pgvector
-- À exécuter dans l'éditeur SQL de Supabase

-- Assure-toi que l'extension pgvector est activée
CREATE EXTENSION IF NOT EXISTS vector;

-- Fonction match_documents pour la recherche vectorielle
-- Adapte le nom de ta table et les colonnes selon ton schéma
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536), -- Ajuste la dimension selon ton modèle (1536 pour OpenAI text-embedding-ada-002, 768 pour d'autres)
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE
    -- Appliquer les filtres si fournis
    (filter = '{}'::jsonb OR documents.metadata @> filter)
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Si ta table s'appelle différemment (ex: documents_metadata, chunks, etc.)
-- Remplace "documents" par le nom de ta table
-- Exemple pour une table "chunks" :
/*
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.content,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) as similarity
  FROM chunks
  WHERE
    (filter = '{}'::jsonb OR chunks.metadata @> filter)
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/

-- Pour vérifier que la fonction existe :
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'match_documents';

