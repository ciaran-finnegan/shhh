interface CreateResponse {
  id: string;
  expiresIn: number;
}

interface RetrieveResponse {
  ciphertext: string;
}

interface ErrorResponse {
  error: string;
}

export async function createSecret(
  ciphertext: string,
  ttl: number,
): Promise<CreateResponse> {
  const res = await fetch("/api/secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ciphertext, ttl }),
  });

  if (!res.ok) {
    const data = (await res.json()) as ErrorResponse;
    throw new Error(data.error || "Failed to create secret");
  }

  return res.json() as Promise<CreateResponse>;
}

export async function retrieveSecret(id: string): Promise<string> {
  const res = await fetch(`/api/secrets/${id}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("This secret has already been opened or never existed.");
    }
    if (res.status === 429) {
      throw new Error("Too many requests. Please wait a moment.");
    }
    const data = (await res.json()) as ErrorResponse;
    throw new Error(data.error || "Failed to retrieve secret");
  }

  const data = (await res.json()) as RetrieveResponse;
  return data.ciphertext;
}
