export type Slot = { professor_id: string; starts_at: string };
export type Booking = {
  id: string;
  code: string;
  professor_id: string;
  modality_id: string;
  starts_at: string;
  student_name: string;
  phone: string;
  guest_name: string | null;
  status: string;
  expires_at: string;
  price_cents: number;
  created_at: string;
  updated_at: string;
};
export type Settings = {
  price_cents: number;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_holder: string | null;
};
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export async function api<T>(
  action: string,
  body: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  if (!configured)
    throw new Error(
      "O agendamento online está em configuração. Fale com o Diego pelo WhatsApp.",
    );
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hardkick`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, ...body }),
    },
  );
  const data = await response
    .json()
    .catch(() => ({ error: "Não foi possível concluir. Tente novamente." }));
  if (!response.ok)
    throw new Error(
      data.error || "Não foi possível concluir. Tente novamente.",
    );
  return data;
}
