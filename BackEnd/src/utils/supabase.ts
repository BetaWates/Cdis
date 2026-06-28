import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase storage is not configured');
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseKey);
  }

  return client;
}

export async function uploadPdf(fileBuffer: Buffer, fileName: string): Promise<string> {
  const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const bucket = process.env.SUPABASE_BUCKET || 'inspection-pdfs';

  const { error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(cleanName, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = getSupabaseClient().storage.from(bucket).getPublicUrl(cleanName);
  return data.publicUrl;
}

export async function deletePdf(filePath: string): Promise<void> {
  const bucket = process.env.SUPABASE_BUCKET || 'inspection-pdfs';
  const { error } = await getSupabaseClient().storage.from(bucket).remove([filePath]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}
